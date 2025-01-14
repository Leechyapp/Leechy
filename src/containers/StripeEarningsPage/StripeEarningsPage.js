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

  const { stripeBalance, stripeBalanceLoading, stripeBalanceError } = state.StripeEarningsPage;
  const [pendingAmount, setPendingAmount] = useState();
  const [availableAmount, setAvailableAmount] = useState();
  const [stripeAccountPayoutInProgress, setStripeAccountPayoutInProgress] = useState(null);
  const [dashboardLinkInProgress, setDashboardLinkInProgress] = useState(false);
  const [payoutIntervalModalOpen, setPayoutIntervalModalOpen] = useState(false);
  const [selectedPayoutInterval, setSelectedPayoutInterval] = useState();
  const [updatePayoutIntervalInProgress, setUpdatePayoutIntervalInProgress] = useState(false);

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
      dispatch(fetchStripeExpress());
      dispatch(loadData());
    }
    if (payoutInterval) {
      setSelectedPayoutInterval(payoutInterval);
    }
  }, [stripeBalance, payoutInterval]);

  const onCreateStripeAccountPayout = transactionId => {
    setStripeAccountPayoutInProgress(true);
    createStripeAccountPayout({ transactionId })
      .then(() => {
        dispatch(loadData());
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
    } else {
      const formattedAmount = formatMoney(intl, new Money(0, currency));
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
    dispatch(fetchStripeAccountBalance());
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
          <PullToRefresh refreshData={refreshData}>
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
                    <div className={css.rowUnsetMarginLR}>
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          <FormattedMessage id="StripeEarningsPage.balance.pending.title" />
                        </label>
                        <span>{pendingAmount ? pendingAmount : emptyDash}</span>
                      </div>
                      <div className={css.colBalance}>
                        <label className={css.colBalanceTitle}>
                          <FormattedMessage id="StripeEarningsPage.balance.available.title" />
                        </label>
                        <span>{availableAmount ? availableAmount : emptyDash}</span>
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
                      {payoutInterval === PayoutIntervalEnum.Manual && (
                        <div className={css.col12}>
                          <Button
                            className={css.payoutButton}
                            onClick={() => onCreateStripeAccountPayout()}
                            inProgress={stripeAccountPayoutInProgress}
                            disabled={
                              !availableAmount ||
                              availableAmount === emptyDash ||
                              stripeBalance?.availableAmount?.amount === 0
                            }
                            type="button"
                          >
                            <FormattedMessage id="StripeEarningsPage.payoutButton" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </PullToRefresh>
        </LayoutSideNavigation>
        <NativeBottomNavbar />
        <Modal
          id="StripeEarningsPage.payoutIntervalModal"
          isOpen={payoutIntervalModalOpen}
          onClose={() => setPayoutIntervalModalOpen(false)}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <FinalForm
            {...props}
            onSubmit={() => null}
            render={() => {
              return (
                <Form className={css.payoutIntervalForm}>
                  <h5>
                    <FormattedMessage id="StripeEarningsPage.payoutIntervalModal.title" />
                  </h5>
                  <FieldRadioButton
                    id={PayoutIntervalEnum.Daily}
                    rootClassName={css.cancelTypeFields}
                    label={intl.formatMessage({
                      id: `StripeEarningsPage.payoutInterval.${PayoutIntervalEnum.Daily}`,
                    })}
                    value={PayoutIntervalEnum.Daily}
                    onChange={e => setSelectedPayoutInterval(e.target.value)}
                    checked={selectedPayoutInterval === PayoutIntervalEnum.Daily}
                  />
                  <FieldRadioButton
                    id={PayoutIntervalEnum.Manual}
                    rootClassName={css.cancelTypeFields}
                    label={intl.formatMessage({
                      id: `StripeEarningsPage.payoutInterval.${PayoutIntervalEnum.Manual}`,
                    })}
                    value={PayoutIntervalEnum.Manual}
                    onChange={e => setSelectedPayoutInterval(e.target.value)}
                    checked={selectedPayoutInterval === PayoutIntervalEnum.Manual}
                  />
                  <Button
                    className={css.updatePayoutIntervalButton}
                    onClick={() => onUpdatePayoutInterval()}
                    inProgress={updatePayoutIntervalInProgress}
                    disabled={!payoutInterval || payoutInterval === selectedPayoutInterval}
                    type="button"
                  >
                    <FormattedMessage id="StripeEarningsPage.updatePayoutIntervalButton" />
                  </Button>
                </Form>
              );
            }}
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
