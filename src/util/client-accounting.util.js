const SECURITY_DEPOSIT_COMMISSION = 0.9;

export default class ClientAccountingUtil {
  static convertStripeIntegerToMoney(amount) {
    return parseFloat((amount / 100).toFixed(2));
  }

  static roundToStripeInteger(amount) {
    return Math.round(amount);
  }

  static convertToDecimalAmount(amount) {
    return parseFloat(amount.toFixed(2));
  }

  static convertToPositiveNumber(amount) {
    return +Math.abs(amount);
  }

  static convertToNegativeNumber(amount) {
    return -Math.abs(amount);
  }

  static getMoneyAmount(amount) {
    if (amount) {
      const isNegative = amount < 0;
      const num = this.convertStripeIntegerToMoney(this.convertToPositiveNumber(amount)).toString();
      const dec = num.split('.')[1];
      const len = dec && dec.length > 2 ? dec.length : 2;
      const fixed = Number(num).toFixed(len);
      const negativeSign = isNegative ? '-' : '';
      return `${negativeSign}US$${fixed}`;
    } else {
      return '';
    }
  }

  static calculateSecurityDeposit(params) {
    const { securityDepositPercentageValue, payinTotal } = params;

    const payinTotalAmount = payinTotal.amount;
    const depositAmountUnformatted = payinTotalAmount * (securityDepositPercentageValue / 100);
    const depositAmount2Decimals = this.convertToDecimalAmount(depositAmountUnformatted);
    const securityDepositAmount = this.roundToStripeInteger(depositAmount2Decimals);
    const securityDepositTransferAmount = this.roundToStripeInteger(
      securityDepositAmount * SECURITY_DEPOSIT_COMMISSION
    );

    const totalPlusSecurityDepositPrice = payinTotalAmount + securityDepositTransferAmount;

    return {
      totalPlusSecurityDepositPrice,
      securityDepositAmount,
      securityDepositTransferAmount,
    };
  }
}
