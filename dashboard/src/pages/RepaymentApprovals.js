import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ActionModal, { modalFormStyles } from '@components/ActionModal';
import DataTable from '@components/DataTable';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';
import { getPayments, submitDirectorReview, submitManagerReview } from '@api';
import { hasAction } from '@/constants/access';
import { useAuth } from '@hooks/useAuth';
import { metricGridStyle } from '@/styles/layout';
import { useToast } from '@components/ToastProvider';

function formatCurrency(value) {
  return 'ZMW ' + (Number(value || 0) / 100).toFixed(2);
}

export default function RepaymentApprovals() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canDirectorApprove = hasAction(user, 'repayments.approve_director');
  const canManagerApprove = hasAction(user, 'repayments.approve_manager');
  const [activeTab, setActiveTab] = useState(canDirectorApprove ? 'director' : canManagerApprove ? 'manager' : 'completed');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [decision, setDecision] = useState('approve');
  const [remark, setRemark] = useState('');
  const queryClient = useQueryClient();
  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
    staleTime: 4000
  });

  const reviewMutation = useMutation({
    mutationFn: function submitReview(payload) {
      if (!selectedPayment) {
        return Promise.reject(new Error('No repayment selected'));
      }

      if (activeTab === 'director') {
        return submitDirectorReview(selectedPayment.id, payload);
      }

      return submitManagerReview(selectedPayment.id, payload);
    },
    onSuccess: () => {
      setSelectedPayment(null);
      setDecision('approve');
      setRemark('');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      showToast({
        type: 'success',
        title: decision === 'approve' ? 'Repayment approved' : 'Repayment rejected',
        message: 'The approval queue has been updated.'
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Review failed',
        message: error.response?.data?.message || error.message || 'Unable to submit the repayment review.'
      });
    }
  });

  const payments = paymentsQuery.data || [];
  const directorRows = useMemo(() => {
    return payments
      .filter((payment) => payment.approvalStatus === 'pending_director')
      .map(toApprovalRow);
  }, [payments]);
  const managerRows = useMemo(() => {
    return payments
      .filter((payment) => payment.approvalStatus === 'pending_manager')
      .map(toApprovalRow);
  }, [payments]);
  const completedRows = useMemo(() => {
    return payments
      .filter((payment) => payment.approvalStatus === 'completed' || payment.approvalStatus === 'rejected')
      .map(function toCompletedRow(payment) {
        return {
          id: payment.id,
          customerName: payment.customer?.fullName || payment.loan?.customer?.fullName || 'Unknown customer',
          loanDevice: payment.loan?.device ? payment.loan.device.brand + ' ' + payment.loan.device.model : payment.loanId,
          amount: formatCurrency(payment.amount),
          channel: payment.channel || payment.method,
          outcome: payment.approvalStatus === 'completed' ? 'Approved' : 'Rejected',
          initiator: payment.initiator?.fullName || (payment.method === 'cash' ? 'Manual entry' : 'Gateway'),
          director: approverLabel(payment.directorApprover?.fullName, payment.directorDecision, payment.directorRemark),
          manager: approverLabel(payment.managerApprover?.fullName, payment.managerDecision, payment.managerRemark),
          completedAt: payment.completedAt ? new Date(payment.completedAt).toLocaleString() : '-',
          createdAtRaw: new Date(payment.createdAt).getTime()
        };
      })
      .sort((left, right) => right.createdAtRaw - left.createdAtRaw);
  }, [payments]);

  const stats = useMemo(() => ({
    directorQueue: directorRows.length,
    managerQueue: managerRows.length,
    completed: completedRows.length
  }), [completedRows.length, directorRows.length, managerRows.length]);

  const rows = activeTab === 'director' ? directorRows : activeTab === 'manager' ? managerRows : completedRows;

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Approval Workflow"
        title="Repayment approvals"
        subtitle="Director reviews happen first, manager reviews happen second, and only fully approved manual cash repayments reduce the loan balance."
      />

      <div style={styles.metrics}>
        <KPICard label="Director Queue" value={stats.directorQueue} accent="#f59e0b" />
        <KPICard label="Manager Queue" value={stats.managerQueue} accent="#0ea5e9" />
        <KPICard label="Completed Records" value={stats.completed} accent="#16a34a" />
      </div>

      <div style={styles.tabs}>
        <button type="button" style={{ ...styles.tab, ...(activeTab === 'director' ? styles.tabActive : null) }} onClick={() => setActiveTab('director')} disabled={!canDirectorApprove}>
          Director
        </button>
        <button type="button" style={{ ...styles.tab, ...(activeTab === 'manager' ? styles.tabActive : null) }} onClick={() => setActiveTab('manager')} disabled={!canManagerApprove}>
          Manager
        </button>
        <button type="button" style={{ ...styles.tab, ...(activeTab === 'completed' ? styles.tabActive : null) }} onClick={() => setActiveTab('completed')}>
          Completed
        </button>
      </div>

      {activeTab === 'completed' ? (
        <DataTable
          columns={[
            { key: 'customerName', label: 'Customer' },
            { key: 'loanDevice', label: 'Device / Loan' },
            { key: 'amount', label: 'Amount' },
            { key: 'channel', label: 'Channel' },
            { key: 'outcome', label: 'Outcome' },
            { key: 'initiator', label: 'Initiator' },
            { key: 'director', label: 'Director' },
            { key: 'manager', label: 'Manager' },
            { key: 'completedAt', label: 'Completed' }
          ]}
          rows={rows}
        />
      ) : (
        <DataTable
          columns={[
            { key: 'customerName', label: 'Customer' },
            { key: 'loanDevice', label: 'Device / Loan' },
            { key: 'amount', label: 'Amount' },
            { key: 'channel', label: 'Channel' },
            { key: 'initiator', label: 'Initiator' },
            { key: 'lastRemark', label: 'Remarks' },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div style={styles.actionRow}>
                  <button type="button" style={styles.approveButton} onClick={() => openDecisionModal(row, 'approve', setSelectedPayment, setDecision, setRemark)}>
                    Approve
                  </button>
                  <button type="button" style={styles.rejectButton} onClick={() => openDecisionModal(row, 'reject', setSelectedPayment, setDecision, setRemark)}>
                    Reject
                  </button>
                </div>
              )
            }
          ]}
          rows={rows}
        />
      )}

      {activeTab !== 'completed' && !rows.length ? (
        <div style={styles.emptyNote}>
          No repayments are waiting in the {activeTab} queue right now.
        </div>
      ) : null}

      <ActionModal
        isOpen={Boolean(selectedPayment)}
        title={(decision === 'approve' ? 'Approve' : 'Reject') + ' repayment'}
        subtitle="Add a remark so the completed trail clearly shows who reviewed the payment and why."
        submitLabel={decision === 'approve' ? 'Submit approval' : 'Submit rejection'}
        loading={reviewMutation.isPending}
        error={reviewMutation.error?.response?.data?.message || reviewMutation.error?.message || ''}
        onClose={() => {
          setSelectedPayment(null);
          setDecision('approve');
          setRemark('');
        }}
        onSubmit={() => reviewMutation.mutate({ decision, remark })}
      >
        <div style={modalFormStyles.grid}>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Repayment</label>
            <div style={styles.selectionCard}>
              {selectedPayment ? (
                <>
                  <strong>{selectedPayment.customerName}</strong>
                  <span>{selectedPayment.loanDevice}</span>
                  <span>{selectedPayment.amount}</span>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Remark</label>
            <textarea
              style={{ ...modalFormStyles.input, minHeight: '110px', resize: 'vertical' }}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Reason for approval or rejection"
            />
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

function toApprovalRow(payment) {
  return {
    id: payment.id,
    customerName: payment.customer?.fullName || payment.loan?.customer?.fullName || 'Unknown customer',
    loanDevice: payment.loan?.device ? payment.loan.device.brand + ' ' + payment.loan.device.model : payment.loanId,
    amount: formatCurrency(payment.amount),
    channel: payment.channel || payment.method,
    initiator: payment.initiator?.fullName || 'Unknown initiator',
    lastRemark: payment.directorRemark || payment.managerRemark || payment.providerResponse?.note || '-'
  };
}

function approverLabel(name, decision, remark) {
  if (!name && decision === 'pending') {
    return '-';
  }

  return [name || 'Pending', decision && decision !== 'pending' ? '(' + decision + ')' : '', remark || '']
    .filter(Boolean)
    .join(' ');
}

function openDecisionModal(row, nextDecision, setSelectedPayment, setDecision, setRemark) {
  setSelectedPayment(row);
  setDecision(nextDecision);
  setRemark('');
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  metrics: {
    ...metricGridStyle
  },
  tabs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  tab: {
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.62)',
    color: '#cbd5e1',
    borderRadius: '999px',
    padding: '10px 16px',
    cursor: 'pointer'
  },
  tabActive: {
    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.22) 0%, rgba(15, 118, 110, 0.18) 100%)',
    color: '#fff',
    borderColor: 'rgba(94, 234, 212, 0.28)'
  },
  actionRow: {
    display: 'flex',
    gap: '8px'
  },
  approveButton: {
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    background: '#16a34a',
    color: '#fff',
    cursor: 'pointer'
  },
  rejectButton: {
    border: 0,
    borderRadius: '10px',
    padding: '10px 12px',
    background: '#dc2626',
    color: '#fff',
    cursor: 'pointer'
  },
  selectionCard: {
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.58)',
    color: '#e2e8f0',
    padding: '14px',
    display: 'grid',
    gap: '6px'
  },
  emptyNote: {
    borderRadius: '18px',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    background: 'rgba(15, 23, 42, 0.58)',
    color: '#94a3b8',
    padding: '18px'
  }
};
