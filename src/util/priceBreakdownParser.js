import Decimal from 'decimal.js';
import { types as sdkTypes } from './sdkLoader';
import momentTz from 'moment-timezone';
import PriceBreakdownFormatTypeEnum from '../enums/price-breakdown-format-type.enum';
import { convertStripeIntegerToMoney } from './accounting.util';
const { Money } = sdkTypes;

export const parseLineItems = (lineItems, formatType) => {
  if (formatType === PriceBreakdownFormatTypeEnum.Json) {
    const trxLineItems = [];
    for (let i = 0; i < lineItems.length; i++) {
      trxLineItems.push({
        ...lineItems[i],
        unitPrice: {
          amount: lineItems[i].unitPrice.amount,
          currency: lineItems[i].unitPrice.currency,
        },
        lineTotal: {
          amount: lineItems[i].lineTotal.amount,
          currency: lineItems[i].lineTotal.currency,
        },
        quantity: lineItems[i].quantity ? 1 : null,
      });
    }
    return trxLineItems;
  } else if (formatType === PriceBreakdownFormatTypeEnum.EmailJson) {
    const trxLineItems = [];
    for (let i = 0; i < lineItems.length; i++) {
      trxLineItems.push({
        ...lineItems[i],
        unitPrice: {
          amount: convertStripeIntegerToMoney(lineItems[i].unitPrice.amount),
          currency: lineItems[i].unitPrice.currency,
        },
        lineTotal: {
          amount: convertStripeIntegerToMoney(lineItems[i].lineTotal.amount),
          currency: lineItems[i].lineTotal.currency,
        },
        quantity: lineItems[i].quantity ? 1 : null,
      });
    }
    return trxLineItems;
  } else if (formatType === PriceBreakdownFormatTypeEnum.Sharetribe) {
    const trxLineItems = [];
    for (let i = 0; i < lineItems.length; i++) {
      trxLineItems.push({
        ...lineItems[i],
        unitPrice: new Money(lineItems[i].unitPrice.amount, lineItems[i].unitPrice.currency),
        lineTotal: new Money(lineItems[i].lineTotal.amount, lineItems[i].lineTotal.currency),
        quantity: lineItems[i].quantity ? new Decimal(lineItems[i].quantity) : null,
      });
    }
    return trxLineItems;
  } else {
    return lineItems;
  }
};

export const parsePayTotal = (payTotal, formatType) => {
  if (formatType === PriceBreakdownFormatTypeEnum.Json) {
    return {
      amount: payTotal.amount,
      currency: payTotal.currency,
    };
  } else if (formatType === PriceBreakdownFormatTypeEnum.EmailJson) {
    return {
      amount: convertStripeIntegerToMoney(payTotal.amount),
      currency: payTotal.currency,
    };
  } else if (formatType === PriceBreakdownFormatTypeEnum.Sharetribe) {
    return new Money(payTotal.amount, payTotal.currency);
  } else {
    return payTotal;
  }
};

const getEmailDateProps = (bookingDate, timeZone) => {
  const theDate = new Date(bookingDate);
  const date = momentTz(theDate).tz(timeZone);
  const getFormat = format => {
    return parseInt(date.format(format));
  };
  return {
    year: getFormat('YYYY'),
    month: getFormat('M'),
    day: getFormat('D'),
    hours: getFormat('h'),
    minutes: getFormat('m'),
    seconds: getFormat('s'),
    milliseconds: getFormat('SSS'),
  };
};

export const parseSharetribeCompatibleEmailData = params => {
  const {
    bookingStart,
    bookingEnd,
    displayStart,
    displayEnd,
    lineItems,
    payinTotal,
    payoutTotal,
    timeZone,
  } = params;
  return {
    bookingStart: getEmailDateProps(bookingStart, timeZone),
    bookingEnd: getEmailDateProps(bookingEnd, timeZone),
    bookingStart: getEmailDateProps(displayStart, timeZone),
    bookingEnd: getEmailDateProps(displayEnd, timeZone),
    lineItems: parseLineItems(lineItems, PriceBreakdownFormatTypeEnum.EmailJson),
    payinTotal: parsePayTotal(payinTotal, PriceBreakdownFormatTypeEnum.EmailJson),
    payoutTotal: parsePayTotal(payoutTotal, PriceBreakdownFormatTypeEnum.EmailJson),
  };
};
