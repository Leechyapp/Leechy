import { useSelector } from 'react-redux';
import { connectStripeAccount, createStripeDashboardLink } from '../../util/api';
import React, { useState } from 'react';
import StripeConnectAccountStatusBox from '../StripeConnectAccountStatusBox/StripeConnectAccountStatusBox';
import css from './StripeExpressStatusBox.module.scss';
import { propTypes } from '../../util/types';
import Button from '../Button/Button';
import { FormattedMessage, injectIntl } from 'react-intl';
import { IconSpinner } from '..';

const StripeExpressStatusBox = injectIntl(props => {
  const { intl, transactionId, isCustomOffer } = props;

  const state = useSelector(state => state);

  const stripeExpressPayoutPage = state?.StripeExpressPayoutPage;
  const { fetchStripeExpressInProgress } = stripeExpressPayoutPage;
  const stripeExpress = stripeExpressPayoutPage?.stripeExpress;
  const payouts_enabled = stripeExpress?.payouts_enabled;

  const [accountLinkInProgress, setAccountLinkInProgress] = useState(false);
  const [dashboardLinkInProgress, setDashboardLinkInProgress] = useState(false);
  const [accountLinkInError, setAccountLinkError] = useState(null);
  const [countryCode, setCountryCode] = useState('');

  const onConnnectStripeAccount = (linkTarget = '_self') => {
    setAccountLinkInProgress(true);
    connectStripeAccount({ transactionId: transactionId?.uuid, countryCode })
      .then(link => {
        if (link) {
          window.open(link, linkTarget);
          if (linkTarget === '_blank') {
            setAccountLinkInProgress(false);
          }
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

  const getStripeConnectExpressDashboardLink = () => {
    setDashboardLinkInProgress(true);
    createStripeDashboardLink({})
      .then(link => {
        if (link) {
          window.open(link, '_blank');
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
