import React, { useEffect, useState } from 'react';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import css from './StripeEarningsPage.module.scss';
import { Button, H3, IconSpinner, LayoutSideNavigation, Page, UserNav } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { createStripeAccountPayout } from '../../util/api';
import { useDispatch, useSelector } from 'react-redux';
import { loadData } from './StripeEarningsPage.duck';
import { types as sdkTypes } from '../../util/sdkLoader';
import { formatMoney } from '../../util/currency';
const { Money } = sdkTypes;

export const StripeEarningsPage = injectIntl(props => {
  const { intl, title, scrollingDisabled } = props;

  const dispatch = useDispatch();

  const state = useSelector(state => state);
  const { stripeBalance, stripeBalanceLoading, stripeBalanceError } = state.StripeEarningsPage;
  const [pendingAmount, setPendingAmount] = useState();
  const [availableAmount, setAvailableAmount] = useState();
  const [stripeAccountPayoutInProgress, setStripeAccountPayoutInProgress] = useState(null);

  useEffect(() => {
    if (stripeBalance) {
      const { pendingAmount, availableAmount } = stripeBalance;
      if (pendingAmount) {
        const formattedAmount = onFormatMoney(pendingAmount.amount, pendingAmount.currency);
        setPendingAmount(formattedAmount);
      }
      if (availableAmount) {
        const formattedAmount = onFormatMoney(availableAmount.amount, availableAmount.currency);
        setAvailableAmount(formattedAmount);
      }
    } else {
      dispatch(loadData());
    }
  }, [stripeBalance]);

  const onCreateStripeAccountPayout = transactionId => {
    setStripeAccountPayoutInProgress(true);
    createStripeAccountPayout({ transactionId })
      .then(() => {
        setStripeAccountPayoutInProgress(false);
      })
      .catch(error => {
        console.error(error);
        setStripeAccountPayoutInProgress(false);
      });
  };

  const onFormatMoney = (amount, currency) => {
    if (amount && currency) {
      const formattedAmount = formatMoney(intl, new Money(amount, currency));
      return formattedAmount;
    }
    return '--';
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation
        topbar={
          <>
            <TopbarContainer
              desktopClassName={css.desktopTopbar}
              mobileClassName={css.mobileTopbar}
            />
            <UserNav currentPage="StripeEarningsPage" />
          </>
        }
        sideNav={null}
        useAccountSettingsNav
        currentPage="StripeEarningsPage"
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="StripeEarningsPage.heading" />
          </H3>
          {stripeBalanceLoading ? (
            <div className={css.rowUnsetMarginLR}>
              <div className={css.col12}>
                <IconSpinner />
              </div>
            </div>
          ) : (
            <>
              <div className={css.stripeBalanceContainer}>
                <div className={css.rowUnsetMarginLR}>
                  <div className={css.col6}>
                    <label>
                      <FormattedMessage id="StripeEarningsPage.balance.pending.title" />
                    </label>
                    <span>{pendingAmount ? pendingAmount : '--'}</span>
                  </div>
                  <div className={css.col6}>
                    <label>
                      <FormattedMessage id="StripeEarningsPage.balance.available.title" />
                    </label>
                    <span>{availableAmount ? availableAmount : '--'}</span>
                  </div>
                </div>
              </div>
              <br />
              <div className={css.rowUnsetMarginLR}>
                <div className={css.col12}>
                  <Button
                    onClick={() => onCreateStripeAccountPayout()}
                    inProgress={stripeAccountPayoutInProgress}
                    disabled={!availableAmount || availableAmount === '--'}
                  >
                    <FormattedMessage id="StripeEarningsPage.payoutButton" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </LayoutSideNavigation>
    </Page>
  );
});

StripeEarningsPage.defaultProps = {};

StripeEarningsPage.propTypes = {
  intl: intlShape.isRequired,
};

export default StripeEarningsPage;