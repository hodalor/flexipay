const express = require('express');
const loanController = require('@controllers/loan.controller');
const authMiddleware = require('@middleware/auth.middleware');
const { allowActions } = require('@middleware/permission.middleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/', allowActions('loans.create'), loanController.createLoan);
router.get('/', loanController.getLoans);
router.post('/:id/cancel', allowActions('loans.cancel'), loanController.cancelLoan);
router.get('/:id', loanController.getLoanById);
router.get('/:id/schedule', loanController.getLoanSchedule);
router.get('/:id/payments', loanController.getLoanPayments);

module.exports = router;
