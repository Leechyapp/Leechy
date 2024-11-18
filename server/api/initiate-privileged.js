const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const InsuranceMethodEnum = require('./enums/insurance-method.enum');
const AccountingUtil = require('./utils/accounting.util');
const isNumeric = require('./utils/isNumeric');
const SharetribeService = require('./services/sharetribe.service');
const TransactionUtil = require('./utils/transaction.util');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');

module.exports = (req, res) => {
  const { orderData, bodyParams } = req.body;

  const sdk = getSdk(req, res);
  let lineItems = null;
  let security_deposit = null;

  const listingPromise = () =>
    sdk.listings.show({ id: bodyParams?.params?.listingId, include: ['author'] });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(async ([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const authorId = listing?.relationships?.author?.data?.id;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      lineItems = transactionLineItems(
        listing,
        { ...orderData, ...bodyParams.params },
        providerCommission,
        customerCommission
      );

      const authorRes = await SharetribeService.showUser(req, res, { id: authorId });
      const author = authorRes.data;

      const validLineItems = constructValidLineItems(lineItems);
      const data = TransactionUtil.getReplacementTransactionObject(
        validLineItems,
        authorId,
        author
      );

      const insuranceMethod = bodyParams.params.insuranceMethod;
      if (insuranceMethod === InsuranceMethodEnum.SecurityDeposit) {
        security_deposit = listing?.attributes?.publicData?.security_deposit;
      }

      if (security_deposit) {
        const payinTotal = data?.data?.attributes?.payinTotal;
        if (payinTotal) {
          const securityDepositPercentageValue = isNumeric(security_deposit)
            ? parseInt(security_deposit)
            : null;
          if (securityDepositPercentageValue) {
            const securityDepositAmounts = AccountingUtil.calculateSecurityDeposit({
              securityDepositPercentageValue,
              payinTotal,
            });
            data.data.attributes.protectedData = {
              ...data.data.attributes.protectedData,
              ...securityDepositAmounts,
            };
          }
        }
      }

      const { params } = bodyParams;
      const { bookingStart, bookingEnd } = params;

      data.included[1].attributes.displayStart = bookingStart;
      data.included[1].attributes.displayEnd = bookingEnd;
      data.included[1].attributes.start = bookingStart;
      data.included[1].attributes.end = bookingEnd;

      const status = 200;

      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText: 'OK',
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
