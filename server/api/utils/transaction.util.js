const { default: Decimal } = require('decimal.js');
const {
  convertMoneyToNumber,
  convertUnitToSubUnit,
  unitDivisor,
} = require('../../api-util/currency');
const { types } = require('sharetribe-flex-sdk');
const UUIDService = require('../services/uuid.service');
const MarketplaceConfigEnum = require('../enums/marketplace-config.enum');
const TransitionEnum = require('../enums/transition.enum');
const ProcessAliasEnum = require('../enums/process-alias.enum');
const { Money, UUID } = types;

class TransactionUtil {
  static getReplacementTransactionObject = (lineItems, authorId, author) => {
    const bookingUUID = new UUID(UUIDService.generate());
    return {
      data: {
        id: new UUID(UUIDService.generate()),
        type: 'transaction',
        attributes: {
          processName: ProcessAliasEnum.DefaultBooking,
          transitions: [
            {
              transition: TransitionEnum.RequestPayment,
              createdAt: new Date(),
              by: 'customer',
            },
          ],
          payoutTotal: this.calculatePayoutTotal(lineItems),
          processVersion: 1,
          createdAt: new Date(),
          lastTransitionedAt: new Date(),
          protectedData: {
            stripePaymentIntents: {
              default: {
                stripePaymentIntentClientSecret: UUIDService.generate(),
                stripePaymentIntentId: UUIDService.generate(),
              },
            },
          },
          lineItems,
          lastTransition: TransitionEnum.RequestPayment,
          payinTotal: this.calculatePayinTotal(lineItems),
          metadata: {},
        },
        relationships: {
          provider: {
            data: {
              id: authorId,
              type: 'user',
            },
          },
          booking: {
            data: {
              id: bookingUUID,
              type: 'booking',
            },
          },
        },
      },
      included: [
        {
          id: author.id,
          type: 'user',
          attributes: {
            banned: author.attributes.banned,
            deleted: author.attributes.deleted,
            createdAt: author.attributes.createdAt,
            profile: {
              displayName: author.attributes.profile.displayName,
              abbreviatedName: author.attributes.profile.abbreviatedName,
              bio: author.attributes.profile.bio,
              publicData: author.attributes.profile?.publicData,
              metadata: author.attributes.profile?.metadata,
            },
          },
        },
        {
          id: bookingUUID,
          type: 'booking',
          attributes: {
            start: new Date(),
            end: new Date(),
            displayStart: new Date(),
            displayEnd: new Date(),
          },
        },
      ],
    };
  };

  static estimatedTotalPrice = lineItems => {
    const numericTotalPrice = lineItems.reduce((sum, lineItem) => {
      const numericPrice = convertMoneyToNumber(lineItem.lineTotal);
      return new Decimal(numericPrice).add(sum);
    }, 0);

    // All the lineItems should have same currency so we can use the first one to check that
    // In case there are no lineItems we use currency from config.js as default
    const currency =
      lineItems[0] && lineItems[0].unitPrice
        ? lineItems[0].unitPrice.currency
        : MarketplaceConfigEnum.Currency;

    return new Money(
      convertUnitToSubUnit(numericTotalPrice.toNumber(), unitDivisor(currency)),
      currency
    );
  };

  static calculatePayinTotal(lineItems) {
    const customerLineItems = lineItems.filter(item => item.includeFor.includes('customer'));
    const payinTotal = this.estimatedTotalPrice(customerLineItems);
    return payinTotal;
  }

  static calculatePayoutTotal(lineItems) {
    const providerLineItems = lineItems.filter(item => item.includeFor.includes('provider'));
    const payoutTotal = this.estimatedTotalPrice(providerLineItems);
    return payoutTotal;
  }
}

module.exports = TransactionUtil;
