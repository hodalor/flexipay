import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ActionModal, { modalFormStyles } from '@components/ActionModal';
import DataTable from '@components/DataTable';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';
import { getPayments, initiatePayment, recordManualPayment } from '@api';
import { useLoans } from '@hooks/useLoans';
import { hasAction } from '@/constants/access';
import { useAuth } from '@hooks/useAuth';

function formatCurrency(value) {
  return 'ZMW ' + (Number(value || 0) / 100).toFixed(2);
}

export default function Payments() {
  const { user } = useAuth();
  const canRecordRepayment = hasAction(user, 'repayments.record');
  const queryClient = useQueryClient();
  const loansQuery = useLoans();
  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
    staleTime: 4000
  });
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [mobileSuccess, setMobileSuccess] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [manualForm, setManualForm] = useState({
    loanId: '',
    customerId: '',
    amount: '',
    channel: 'Manual cash',
    note: ''
  });
  const [mobileForm, setMobileForm] = useState({
    loanId: '',
    customerId: '',
    amount: '',
    method: 'mobile_money',
    network: 'MTN'
  });

  const manualMutation = useMutation({
    mutationFn: recordManualPayment,
    onSuccess: () => {
      setManualSuccess('Manual cash repayment recorded. It is now waiting for director approval.');
      setManualError('');
      setManualForm({
        loanId: '',
        customerId: '',
        amount: '',
        channel: 'Manual cash',
        note: ''
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (requestError) => {
      setManualError(requestError.response?.data?.message || 'Unable to record repayment.');
    }
  });

  const paymentMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: (result) => {
      setMobileSuccess('Mobile or card payment initiated successfully. A valid gateway callback will move it straight to completed.');
      setMobileError('');
      setPaymentResult(result);
      setMobileForm({
        loanId: '',
        customerId: '',
        amount: '',
        method: 'mobile_money',
        network: 'MTN'
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (requestError) => {
      setMobileError(requestError.response?.data?.message || 'Unable to initiate payment.');
    }
  });

  const loans = loansQuery.data || [];
  const payments = paymentsQuery.data || [];
  const rows = useMemo(() => {
    return payments.map(function toRow(payment) {
      const loan = payment.loan || {};
      return {
        id: payment.id,
        customerName: payment.customer?.fullName || loan.customer?.fullName || 'Unknown customer',
        loanDevice: loan.device ? loan.device.brand + ' ' + loan.device.model : loan.id || 'Loan',
        reference: payment.reference,
        amount: formatCurrency(payment.amount),
        channel: payment.channel || payment.method,
        approvalStatus: formatApprovalStatus(payment.approvalStatus),
        initiatedBy: payment.initiator?.fullName || (payment.method === 'cash' ? 'Manual entry' : 'Gateway'),
        createdAt: new Date(payment.createdAt).toLocaleString(),
        createdAtRaw: new Date(payment.createdAt).getTime()
      };
    }).sort(function sortRows(left, right) {
      return right.createdAtRaw - left.createdAtRaw;
    });
  }, [payments]);

  const stats = useMemo(() => {
    return {
      totalPayments: rows.length,
      pendingApprovals: payments.filter((payment) => ['pending_director', 'pending_manager'].includes(payment.approvalStatus)).length,
      completedValue: formatCurrency(payments.filter((payment) => payment.approvalStatus === 'completed').reduce((sum, payment) => sum + Number(payment.amount || 0), 0))
    };
  }, [payments, rows]);

  function handleLoanChange(type, value) {
    const selectedLoan = loans.find((loan) => loan.id === value);
    const update = {
      loanId: value,
      customerId: selectedLoan?.customerId || '',
      amount: selectedLoan ? String(Math.max(Number(selectedLoan.totalPayable || 0) - Number(selectedLoan.amountPaid || 0), 0) / 100) : ''
    };

    if (type === 'manual') {
      setManualForm((current) => ({
        ...current,
        ...update
      }));
      return;
    }

    setMobileForm((current) => ({
      ...current,
      ...update
    }));
  }

  function handleFieldChange(type, key, value) {
    const setter = type === 'manual' ? setManualForm : setMobileForm;

    setter((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleRecordManualPayment() {
    setManualError('');
    setManualSuccess('');

    if (!manualForm.loanId || !manualForm.customerId || !manualForm.amount) {
      setManualError('Loan, customer, and amount are required.');
      return;
    }

    manualMutation.mutate({
      ...manualForm,
      amount: Number(manualForm.amount)
    });
  }

  function handleInitiatePayment() {
    setMobileError('');
    setMobileSuccess('');
    setPaymentResult(null);

    if (!mobileForm.loanId || !mobileForm.customerId || !mobileForm.amount || !mobileForm.method) {
      setMobileError('Loan, customer, amount, and method are required.');
      return;
    }

    paymentMutation.mutate({
      ...mobileForm,
      amount: Number(mobileForm.amount)
    });
  }

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Collections"
        title="Repayment recording"
        subtitle="Record manual cash collections for approval, or trigger mobile payment prompts that go straight to completed when the gateway callback succeeds."
        actionLabel={canRecordRepayment ? 'Record cash repayment' : null}
        onAction={canRecordRepayment ? () => {
          setManualError('');
          setManualSuccess('');
          setPaymentResult(null);
          setIsManualOpen(true);
        } : undefined}
        actionDisabled={!loans.length}
        secondaryAction={canRecordRepayment ? (
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setMobileError('');
              setMobileSuccess('');
              setPaymentResult(null);
              setIsMobileOpen(true);
            }}
          >
            Initiate mobile payment
          </button>
        ) : null}
      />

      <div style={styles.metrics}>
        <KPICard label="Payment Records" value={stats.totalPayments} />
        <KPICard label="Pending Approvals" value={stats.pendingApprovals} accent="#f59e0b" />
        <KPICard label="Completed Value" value={stats.completedValue} accent="#16a34a" />
      </div>

      <DataTable
        columns={[
          { key: 'customerName', label: 'Customer' },
          { key: 'loanDevice', label: 'Device / Loan' },
          { key: 'reference', label: 'Reference' },
          { key: 'amount', label: 'Amount' },
          { key: 'channel', label: 'Channel' },
          { key: 'approvalStatus', label: 'Status' },
          { key: 'initiatedBy', label: 'Initiator' },
          { key: 'createdAt', label: 'Created' }
        ]}
        rows={rows}
      />

      <ActionModal
        isOpen={isManualOpen}
        title="Record cash repayment"
        subtitle="Manual cash entries wait for director approval first, then manager approval. The loan balance does not reduce until final approval."
        submitLabel="Record repayment"
        loading={manualMutation.isPending}
        error={manualError}
        success={manualSuccess}
        onClose={() => setIsManualOpen(false)}
        onSubmit={handleRecordManualPayment}
      >
        <div style={modalFormStyles.grid}>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Loan</label>
            <select style={modalFormStyles.input} value={manualForm.loanId} onChange={(event) => handleLoanChange('manual', event.target.value)}>
              <option value="">Select loan</option>
              {loans.map(function renderLoan(loan) {
                return (
                  <option key={loan.id} value={loan.id}>
                    {(loan.customer?.fullName || 'Customer') + ' - ' + (loan.device ? loan.device.brand + ' ' + loan.device.model : loan.id)}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Amount (ZMW)</label>
            <input style={modalFormStyles.input} type="number" min="0" step="0.01" value={manualForm.amount} onChange={(event) => handleFieldChange('manual', 'amount', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Customer ID</label>
            <input style={modalFormStyles.input} value={manualForm.customerId} onChange={(event) => handleFieldChange('manual', 'customerId', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Channel</label>
            <input style={modalFormStyles.input} value={manualForm.channel} onChange={(event) => handleFieldChange('manual', 'channel', event.target.value)} />
          </div>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Note</label>
            <textarea style={{ ...modalFormStyles.input, minHeight: '96px', resize: 'vertical' }} value={manualForm.note} onChange={(event) => handleFieldChange('manual', 'note', event.target.value)} />
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={isMobileOpen}
        title="Initiate mobile payment"
        subtitle="Use this when the customer should receive a prompt and authorize payment on their phone. Successful callbacks go straight to completed."
        submitLabel="Initiate payment"
        loading={paymentMutation.isPending}
        error={mobileError}
        success={mobileSuccess}
        onClose={() => setIsMobileOpen(false)}
        onSubmit={handleInitiatePayment}
      >
        <div style={modalFormStyles.grid}>
          <div style={{ ...modalFormStyles.field, ...modalFormStyles.fieldFull }}>
            <label style={modalFormStyles.label}>Loan</label>
            <select style={modalFormStyles.input} value={mobileForm.loanId} onChange={(event) => handleLoanChange('mobile', event.target.value)}>
              <option value="">Select loan</option>
              {loans.map(function renderLoan(loan) {
                return (
                  <option key={loan.id} value={loan.id}>
                    {(loan.customer?.fullName || 'Customer') + ' - ' + (loan.device ? loan.device.brand + ' ' + loan.device.model : loan.id)}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Method</label>
            <select style={modalFormStyles.input} value={mobileForm.method} onChange={(event) => handleFieldChange('mobile', 'method', event.target.value)}>
              <option value="mobile_money">Mobile money</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Network</label>
            <select style={modalFormStyles.input} value={mobileForm.network} onChange={(event) => handleFieldChange('mobile', 'network', event.target.value)} disabled={mobileForm.method !== 'mobile_money'}>
              <option value="MTN">MTN</option>
              <option value="Airtel">Airtel</option>
              <option value="Zamtel">Zamtel</option>
            </select>
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Amount (ZMW)</label>
            <input style={modalFormStyles.input} type="number" min="0" step="0.01" value={mobileForm.amount} onChange={(event) => handleFieldChange('mobile', 'amount', event.target.value)} />
          </div>
          <div style={modalFormStyles.field}>
            <label style={modalFormStyles.label}>Customer ID</label>
            <input style={modalFormStyles.input} value={mobileForm.customerId} onChange={(event) => handleFieldChange('mobile', 'customerId', event.target.value)} />
          </div>
        </div>

        {paymentResult ? (
          <div style={styles.resultCard}>
            <div style={styles.resultTitle}>Collection channel details</div>
            <div style={styles.resultRow}><span>Payment ID</span><strong>{paymentResult.paymentId}</strong></div>
            <div style={styles.resultRow}><span>Reference</span><strong>{paymentResult.txRef}</strong></div>
            {paymentResult.ussdCode ? <div style={styles.resultRow}><span>USSD / Note</span><strong>{paymentResult.ussdCode}</strong></div> : null}
            {paymentResult.redirectUrl ? <div style={styles.resultRow}><span>Redirect URL</span><a href={paymentResult.redirectUrl} target="_blank" rel="noreferrer" style={styles.link}>Open payment link</a></div> : null}
          </div>
        ) : null}
      </ActionModal>
    </div>
  );
}

function formatApprovalStatus(status) {
  if (status === 'pending_director') {
    return 'Waiting for director';
  }
  if (status === 'pending_manager') {
    return 'Waiting for manager';
  }
  if (status === 'gateway_pending') {
    return 'Waiting for gateway';
  }
  if (status === 'completed') {
    return 'Completed';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }

  return 'Not required';
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(180px, 240px))',
    gap: '12px'
  },
  secondaryButton: {
    border: '1px solid rgba(148, 163, 184, 0.18)',
    borderRadius: '14px',
    padding: '13px 18px',
    background: 'rgba(15, 23, 42, 0.72)',
    color: '#f8fafc',
    fontWeight: '700',
    cursor: 'pointer'
  },
  resultCard: {
    marginTop: '6px',
    padding: '16px',
    borderRadius: '18px',
    background: 'rgba(15, 23, 42, 0.58)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    display: 'grid',
    gap: '10px'
  },
  resultTitle: {
    color: '#f8fafc',
    fontWeight: '700'
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    color: '#cbd5e1',
    flexWrap: 'wrap'
  },
  link: {
    color: '#99f6e4'
  }
};
