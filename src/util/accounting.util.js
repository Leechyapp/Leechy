export const convertStripeIntegerToMoney = amount => {
  return parseFloat((amount / 100).toFixed(2));
};
