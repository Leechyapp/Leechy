import React, { useEffect, useState } from 'react';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import css from './StripeEarningsPage.module.scss';
import {
  Avatar,
  Button,
  FieldRadioButton,
  H3,
  IconSpinner,
  LayoutSideNavigation,
  Modal,
  Page,
  UserNav,
  Form,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import {
  createStripeAccountPayout,
  createStripeDashboardLink,
  updateStripeAccountPayoutInterval,
  createUnifiedPayout,
  getUnifiedEarnings,
} from '../../util/api';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStripeAccountBalance, loadData } from './StripeEarningsPage.duck';
import { types as sdkTypes } from '../../util/sdkLoader';
import { formatMoney } from '../../util/currency';
import { fetchStripeExpress } from '../StripeExpressPayoutPage/StripeExpressPayoutPage.duck';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import NativeBottomNavbar from '../../components/NativeBottomNavbar/NativeBottomNavbar';
import isNativePlatform from '../../util/isNativePlatform';
import { Form as FinalForm } from 'react-final-form';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh';
const { Money } = sdkTypes;

const emptyDash = '--';

const PayoutIntervalEnum = {
  Daily: 'daily',
  Manual: 'manual',
};

export const StripeEarningsPage = injectIntl(props => {
  const { intl, title, scrollingDisabled } = props;

  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const state = useSelector(state => state);

  const currentUser = state?.user?.currentUser;
  const displayName = currentUser?.attributes?.profile?.displayName;

  const stripeExpressPayoutPage = state?.StripeExpressPayoutPage;
  const stripeExpress = stripeExpressPayoutPage?.stripeExpress;
  const payouts_enabled = stripeExpress?.payouts_enabled;
  const payoutInterval = stripeExpress?.settings?.payouts?.schedule?.interval;

  const [unifiedBalance, setUnifiedBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState(null);
  
  const [totalAvailableAmount, setTotalAvailableAmount] = useState();
  const [totalPendingAmount, setTotalPendingAmount] = useState();
  const [stripeAvailableAmount, setStripeAvailableAmount] = useState();
  const [paypalPendingAmount, setPaypalPendingAmount] = useState();
  
  const [unifiedPayoutInProgress, setUnifiedPayoutInProgress] = useState(false);
  const [dashboardLinkInProgress, setDashboardLinkInProgress] = useState(false);
  const [payoutIntervalModalOpen, setPayoutIntervalModalOpen] = useState(false);
  const [selectedPayoutInterval, setSelectedPayoutInterval] = useState();
  const [updatePayoutIntervalInProgress, setUpdatePayoutIntervalInProgress] = useState(false);

  const loadUnifiedBalance = async () => {
    setBalanceLoading(true);
    setBalanceError(null);
    
    try {
      const result = await getUnifiedEarnings();
      console.log('💰 Unified balance received:', result);
      
      if (result.success && result.balance) {
        setUnifiedBalance(result.balance);
        
        if (result.balance.totalAvailable) {
          setTotalAvailableAmount(onFormatMoney(result.balance.totalAvailable.amount, result.balance.totalAvailable.currency));
        }
        if (result.balance.totalPending) {
          setTotalPendingAmount(onFormatMoney(result.balance.totalPending.amount, result.balance.totalPending.currency));
      }
        if (result.balance.stripeAvailable) {
          setStripeAvailableAmount(onFormatMoney(result.balance.stripeAvailable.amount, result.balance.stripeAvailable.currency));
        }
        if (result.balance.paypalPending) {
          setPaypalPendingAmount(onFormatMoney(result.balance.paypalPending.amount, result.balance.paypalPending.currency));
        }
      }
    } catch (error) {
      console.error('❌ Failed to load unified balance:', error);
      setBalanceError(error);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (!unifiedBalance) {
      dispatch(fetchStripeExpress());
      loadUnifiedBalance();
    }
    if (payoutInterval) {
      setSelectedPayoutInterval(payoutInterval);
    }
  }, [payoutInterval]);

  const onCreateUnifiedPayout = async () => {
    setUnifiedPayoutInProgress(true);
    
    try {
      const result = await createUnifiedPayout();
      console.log('✅ Unified payout result:', result);
      
      if (result.success) {
        await loadUnifiedBalance();
        
        console.log('💰 Total payout:', result.totalPayout?.amount);
        console.log('📊 Payout breakdown:', result.breakdown);
      }
    } catch (error) {
      console.error('❌ Unified payout failed:', error);
      
      // Check if error is related to missing PayPal email
      if (error.message && error.message.includes('PayPal email')) {
        alert('⚠️ PayPal Email Required\n\nTo cash out PayPal earnings, you must add your PayPal email address to your profile first.\n\nGo to: Account Settings → Contact Details → Add your PayPal email for receiving payouts.\n\nIMPORTANT: Use the PayPal email where you want to RECEIVE money, not the one you used to pay.');
      } else {
        alert('Payout failed. Please try again or contact support.');
      }
    } finally {
      setUnifiedPayoutInProgress(false);
    }
  };

  const onFormatMoney = (amount, currency) => {
    if (amount && currency) {
      // Ensure currency is uppercase for Money class
      const formattedAmount = formatMoney(intl, new Money(amount, currency.toUpperCase()));
      return formattedAmount;
    } else {
      const formattedAmount = formatMoney(intl, new Money(0, currency?.toUpperCase() || 'USD'));
      return formattedAmount;
    }
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

  const onUpdatePayoutInterval = () => {
    setUpdatePayoutIntervalInProgress(true);
    updateStripeAccountPayoutInterval({
      interval: selectedPayoutInterval,
    })
      .then(() => {
        dispatch(fetchStripeExpress()).then(() => {
          setUpdatePayoutIntervalInProgress(false);
          setPayoutIntervalModalOpen(false);
        });
      })
      .catch(error => {
        console.error(error);
        setUpdatePayoutIntervalInProgress(false);
      });
  };

  const refreshData = () => {
    loadUnifiedBalance();
  };

  return (
    <>
      <Page title={title} scrollingDisabled={true}>
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
          <PullToRefresh onRefresh={refreshData}>
            <div className={css.content}>
              <H3 as="h1" className={css.heading}>
                <FormattedMessage id="StripeEarningsPage.heading" />
              </H3>
              {balanceLoading ? (
                <div className={css.rowUnsetMarginLR}>
                  <div className={css.col12}>
                    <IconSpinner />
                  </div>
                </div>
              ) : (
                <>
                  <div className={css.stripeBalanceContainer}>
                    <div className={css.rowUnsetMarginLR}>
                      <div className={css.colAvatar}>
                        <Avatar className={css.avatar} user={currentUser} />
                      </div>
                      <div className={css.colStripeAccountContents}>
                        <span className={css.displayName}>{displayName}</span>
                        {stripeExpress && payouts_enabled ? (
                          <p>
                            {dashboardLinkInProgress ? (
                              <IconSpinner />
                            ) : (
                              <a onClick={() => getStripeConnectExpressDashboardLink()}>
                                <FormattedMessage id="StripeEarningsPage.stripeDashboardLink" />
                              </a>
                            )}
                          </p>
                        ) : (
                          <p className={css.disabledViewStripeDashboard}>
                            <FormattedMessage id="StripeEarningsPage.stripeDashboardLink" />
                          </p>
                        )}
                      </div>
                    </div>
                    <br />
                    
                    <div className={css.balanceBreakdown}>
                      {/* Row 1: Total Available (highlighted) */}
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          Total Available
                        </label>
                        <span className={css.totalAvailable}>{totalAvailableAmount || emptyDash}</span>
                      </div>
                      
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          <FormattedMessage id="StripeEarningsPage.balance.pending.title" />
                        </label>
                        <span>{totalPendingAmount || emptyDash}</span>
                      </div>
                      
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          <FormattedMessage id="StripeEarningsPage.payoutInterval.title" />
                        </label>
                        <span>
                          {payoutInterval ? (
                            <span>
                              <FormattedMessage
                                id={`StripeEarningsPage.payoutInterval.${payoutInterval}`}
                              />
                              <span className={css.editPayoutIntervalIcon}>
                                <a onClick={() => setPayoutIntervalModalOpen(true)}>
                                  <FontAwesomeIcon icon={faPenToSquare} />
                                </a>
                              </span>
                            </span>
                          ) : (
                            emptyDash
                          )}
                        </span>
                      </div>
                      
                      {/* Row 2: Payment Method Breakdown */}
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          Stripe Earnings
                        </label>
                        <span>{stripeAvailableAmount || emptyDash}</span>
                      </div>
                      
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          PayPal Earnings
                        </label>
                        <span>{paypalPendingAmount || emptyDash}</span>
                      </div>
                      
                      {/* Empty third column for consistent grid layout */}
                      <div className={css.colBalance}>
                      </div>
                      
                        <div className={css.col12}>
                          <Button
                            className={css.payoutButton}
                          onClick={() => onCreateUnifiedPayout()}
                          inProgress={unifiedPayoutInProgress}
                            disabled={
                            !totalAvailableAmount ||
                            totalAvailableAmount === emptyDash ||
                            unifiedBalance?.totalAvailable?.amount === 0
                            }
                            type="button"
                          >
                            <FormattedMessage id="StripeEarningsPage.payoutButton" />
                          </Button>
                        </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </PullToRefresh>
        </LayoutSideNavigation>
        <NativeBottomNavbar />
        
        <Modal
          id="payoutIntervalModal"
          isOpen={payoutIntervalModalOpen}
          onClose={() => setPayoutIntervalModalOpen(false)}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <FinalForm
            onSubmit={onUpdatePayoutInterval}
            render={({ handleSubmit, submitting, invalid, pristine }) => (
              <Form onSubmit={handleSubmit} className={css.payoutIntervalForm}>
                <H3 as="h1">
                    <FormattedMessage id="StripeEarningsPage.payoutIntervalModal.title" />
                </H3>
                  <FieldRadioButton
                  className={css.payoutIntervalRadio}
                  id="daily"
                  name="payoutInterval"
                  label={intl.formatMessage({ id: 'StripeEarningsPage.payoutInterval.daily' })}
                    value={PayoutIntervalEnum.Daily}
                  checked={selectedPayoutInterval === PayoutIntervalEnum.Daily}
                    onChange={e => setSelectedPayoutInterval(e.target.value)}
                  />
                  <FieldRadioButton
                  className={css.payoutIntervalRadio}
                  id="manual"
                  name="payoutInterval"
                  label={intl.formatMessage({ id: 'StripeEarningsPage.payoutInterval.manual' })}
                    value={PayoutIntervalEnum.Manual}
                  checked={selectedPayoutInterval === PayoutIntervalEnum.Manual}
                    onChange={e => setSelectedPayoutInterval(e.target.value)}
                  />
                  <Button
                    className={css.updatePayoutIntervalButton}
                  type="submit"
                    inProgress={updatePayoutIntervalInProgress}
                  disabled={pristine || invalid || updatePayoutIntervalInProgress}
                  >
                    <FormattedMessage id="StripeEarningsPage.updatePayoutIntervalButton" />
                  </Button>
                </Form>
            )}
          />
        </Modal>
      </Page>
    </>
  );
});

StripeEarningsPage.defaultProps = {};

StripeEarningsPage.propTypes = {
  intl: intlShape.isRequired,
};

export default StripeEarningsPage;
