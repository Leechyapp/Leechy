const getTransition = key => {
  return `transition/${key}`;
};

const TransitionEnum = {
  AcceptByProvider: getTransition('accept'),
  CancelByCustomerPendingBooking: getTransition('cancel-by-customer-pending-booking'),
  ConfirmPayment: getTransition('confirm-payment'),
  RequestPayment: getTransition('request-payment'),
};

module.exports = TransitionEnum;
