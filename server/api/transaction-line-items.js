const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');
const isNumeric = require('./utils/isNumeric');
const InsuranceMethodEnum = require('./enums/insurance-method.enum');

module.exports = (req, res) => {
  const { isOwnListing, listingId, orderData } = req.body;

  const sdk = getSdk(req, res);

  const listingPromise = () =>
    isOwnListing ? sdk.ownListings.show({ id: listingId }) : sdk.listings.show({ id: listingId });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const lineItems = transactionLineItems(
        listing,
        orderData,
        providerCommission,
        customerCommission
      );

      // Because we are using returned lineItems directly in this template we need to use the helper function
      // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
      const validLineItems = constructValidLineItems(lineItems);

      const insuranceMethod = orderData.insuranceMethod;
      let security_deposit = null;
      if (insuranceMethod === InsuranceMethodEnum.SecurityDeposit) {
        security_deposit = listing?.attributes?.publicData?.security_deposit;
      }
      let estimatedTrxProtectedData = {};
      if (security_deposit) {
        const securityDepositPercentageValue = isNumeric(security_deposit)
          ? parseInt(security_deposit)
          : null;
        if (securityDepositPercentageValue) {
          estimatedTrxProtectedData = {
            insuranceMethod,
            securityDepositPercentageValue,
          };
        }
      }

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ lineItems: validLineItems, estimatedTrxProtectedData }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
