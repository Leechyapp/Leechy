const { transactionLineItems } = require('../api-util/lineItems');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const InsuranceMethodEnum = require('./enums/insurance-method.enum');
const AccountingUtil = require('./utils/accounting.util');
const isNumeric = require('./utils/isNumeric');

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body;

  const sdk = getSdk(req, res);
  let lineItems = null;
  let security_deposit = null;

  const listingPromise = () => sdk.listings.show({ id: bodyParams?.params?.listingId });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      lineItems = transactionLineItems(
        listing,
        { ...orderData, ...bodyParams.params },
        providerCommission,
        customerCommission
      );

      const insuranceMethod = bodyParams.params.insuranceMethod;
      if (insuranceMethod === InsuranceMethodEnum.SecurityDeposit) {
        security_deposit = listing?.attributes?.publicData?.security_deposit;
      }

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;

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

      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
