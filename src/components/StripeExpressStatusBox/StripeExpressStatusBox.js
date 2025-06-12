import { useSelector } from 'react-redux';
import { connectStripeAccount, createStripeDashboardLink } from '../../util/api';
import React, { useState } from 'react';
import StripeConnectAccountStatusBox from '../StripeConnectAccountStatusBox/StripeConnectAccountStatusBox';
import StripeConnectEmbedded from '../StripeConnectEmbedded/StripeConnectEmbedded';
import { useConfiguration } from '../../context/configurationContext';
import css from './StripeExpressStatusBox.module.scss';
import { propTypes } from '../../util/types';
import Button from '../Button/Button';
import { FormattedMessage, injectIntl } from 'react-intl';
import { IconSpinner } from '..';
import isNativePlatform from '../../util/isNativePlatform';

const StripeExpressStatusBox = injectIntl(props => {
  const { intl, transactionId, isCustomOffer } = props;
  const config = useConfiguration();

  const state = useSelector(state => state);

  const stripeExpressPayoutPage = state?.StripeExpressPayoutPage;
  const { fetchStripeExpressInProgress } = stripeExpressPayoutPage;
  const stripeExpress = stripeExpressPayoutPage?.stripeExpress;
  const payouts_enabled = stripeExpress?.payouts_enabled;

  const [accountLinkInProgress, setAccountLinkInProgress] = useState(false);
  const [dashboardLinkInProgress, setDashboardLinkInProgress] = useState(false);
  const [accountLinkInError, setAccountLinkError] = useState(null);
  const [countryCode, setCountryCode] = useState('');
  const [showEmbeddedConnect, setShowEmbeddedConnect] = useState(false);
  const [stripeConnectUrl, setStripeConnectUrl] = useState(null);

  const onConnnectStripeAccount = (linkTarget = '_self') => {
    setAccountLinkInProgress(true);
    connectStripeAccount({ transactionId: transactionId?.uuid, countryCode })
      .then(link => {
        if (link) {
          // Instead of opening in new tab, show embedded modal
          if (isNativePlatform) {
            // For native platforms, still use the old method
            window.open(link, '_self');
          } else {
            // For web, use embedded approach
            setStripeConnectUrl(link);
            setShowEmbeddedConnect(true);
          }
          setAccountLinkInProgress(false);
        } else {
          setAccountLinkInProgress(false);
        }
      })
      .catch(error => {
        console.error(error);
        setAccountLinkInProgress(false);
        setAccountLinkError(true);
      });
  };

  const handleEmbeddedSuccess = () => {
    // Refresh the data after successful connection
    window.location.reload();
  };

  const handleEmbeddedError = () => {
    setAccountLinkError(true);
  };

  const handleEmbeddedClose = () => {
    setShowEmbeddedConnect(false);
    setStripeConnectUrl(null);
  };

  const getStripeConnectExpressDashboardLink = () => {
    setDashboardLinkInProgress(true);
    createStripeDashboardLink({})
      .then(link => {
        if (link) {
          const target = isNativePlatform ? '_self' : '_blank';
          window.open(link, target);
          setDashboardLinkInProgress(false);
        } else {
          setDashboardLinkInProgress(false);
        }
      })
      .catch(error => {
        console.error(error);
        setDashboardLinkInProgress(false);
      });
  };

  return (
    <>
      {' '}
      {fetchStripeExpressInProgress ? (
        <IconSpinner />
      ) : (
        <>
          {!stripeExpress && (
            <StripeConnectAccountStatusBox
              intl={intl}
              type="verificationNotStarted"
              inProgress={accountLinkInProgress}
              onGetStripeConnectAccountLink={() => onConnnectStripeAccount()}
              onChangeCountryCode={value => setCountryCode(value)}
              countryCode={countryCode}
            />
          )}
          {stripeExpress && payouts_enabled && (
            <>
              {!isCustomOffer && (
                <>
                  <h6>
                    <FormattedMessage id="StripeExpressStatusBox.connected.label" />
                  </h6>
                  <StripeConnectAccountStatusBox
                    type="verificationSuccess"
                    inProgress={accountLinkInProgress}
                    onGetStripeConnectAccountLink={() => onConnnectStripeAccount()}
                  />
                  <Button
                    inProgress={dashboardLinkInProgress}
                    onClick={() => getStripeConnectExpressDashboardLink()}
                    className={css.stripeConnectCtaButton}
                  >
                    <FormattedMessage id="StripeExpressStatusBox.connected.button" />
                  </Button>
                </>
              )}
            </>
          )}
          {stripeExpress && !payouts_enabled && (
            <StripeConnectAccountStatusBox
              type="verificationNeeded"
              inProgress={accountLinkInProgress}
              onGetStripeConnectAccountLink={() => onConnnectStripeAccount('_blank')}
            />
          )}
        </>
      )}
      
      {/* Embedded Stripe Connect Modal */}
      <StripeConnectEmbedded
        isOpen={showEmbeddedConnect}
        onClose={handleEmbeddedClose}
        stripeUrl={stripeConnectUrl}
        onSuccess={handleEmbeddedSuccess}
        onError={handleEmbeddedError}
        marketplaceRootURL={config.marketplaceRootURL}
      />
    </>
  );
});

StripeExpressStatusBox.defaultProps = {
  transactionId: null,
  isCustomOffer: false,
};

StripeExpressStatusBox.propTypes = {
  rootClassName: propTypes.uuid,
  isCustomOffer: propTypes.bool,
};

export default StripeExpressStatusBox;
