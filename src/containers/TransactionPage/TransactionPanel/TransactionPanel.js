import React, { Component } from 'react';
import { arrayOf, bool, func, node, object, oneOf, string } from 'prop-types';
import classNames from 'classnames';

import { FormattedMessage, injectIntl, intlShape } from '../../../util/reactIntl';
import { displayPrice } from '../../../util/configHelpers';
import { propTypes } from '../../../util/types';
import { userDisplayNameAsString } from '../../../util/data';
import { isMobileSafari } from '../../../util/userAgent';
import { createSlug } from '../../../util/urlHelpers';

import { AvatarLarge, Modal, NamedLink, UserDisplayName } from '../../../components';

import { stateDataShape } from '../TransactionPage.stateData';
import SendMessageForm from '../SendMessageForm/SendMessageForm';

// These are internal components that make this file more readable.
import BreakdownMaybe from './BreakdownMaybe';
import DetailCardHeadingsMaybe from './DetailCardHeadingsMaybe';
import DetailCardImage from './DetailCardImage';
import DeliveryInfoMaybe from './DeliveryInfoMaybe';
import BookingLocationMaybe from './BookingLocationMaybe';
import InquiryMessageMaybe from './InquiryMessageMaybe';
import FeedSection from './FeedSection';
import ActionButtonsMaybe from './ActionButtonsMaybe';
import DiminishedActionButtonMaybe from './DiminishedActionButtonMaybe';
import PanelHeading from './PanelHeading';

import css from './TransactionPanel.module.css';
import RefundSecurityDepositButtonMaybe from './RefundSecurityDepositButtonMaybe';
import ShippingFunctionButtonsMaybe from './ShippingFunctionButtonsMaybe/ShippingFunctionButtonsMaybe';
import { DeliveryMethodEnum } from '../../../enums/delivery-method-enum';
import { states, transitions } from '../../../transactions/transactionProcessBooking';
import { PushNotificationCodeEnum } from '../../../enums/push-notification-code.enum';
import { sendPushNotification } from '../../../util/api';
import StripeExpressStatusBox from '../../../components/StripeExpressStatusBox/StripeExpressStatusBox';

// Helper function to get display names for different roles
const displayNames = (currentUser, provider, customer, intl) => {
  const authorDisplayName = <UserDisplayName user={provider} intl={intl} />;
  const customerDisplayName = <UserDisplayName user={customer} intl={intl} />;

  let otherUserDisplayName = '';
  let otherUserDisplayNameString = '';
  const currentUserIsCustomer =
    currentUser.id && customer?.id && currentUser.id.uuid === customer?.id?.uuid;
  const currentUserIsProvider =
    currentUser.id && provider?.id && currentUser.id.uuid === provider?.id?.uuid;

  if (currentUserIsCustomer) {
    otherUserDisplayName = authorDisplayName;
    otherUserDisplayNameString = userDisplayNameAsString(provider, '');
  } else if (currentUserIsProvider) {
    otherUserDisplayName = customerDisplayName;
    otherUserDisplayNameString = userDisplayNameAsString(customer, '');
  }

  return {
    authorDisplayName,
    customerDisplayName,
    otherUserDisplayName,
    otherUserDisplayNameString,
  };
};

export class TransactionPanelComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sendMessageFormFocused: false,
      showStripeExpressModal: false,
    };
    this.isMobSaf = false;
    this.sendMessageFormName = 'TransactionPanel.SendMessageForm';

    this.onSendMessageFormFocus = this.onSendMessageFormFocus.bind(this);
    this.onSendMessageFormBlur = this.onSendMessageFormBlur.bind(this);
    this.onMessageSubmit = this.onMessageSubmit.bind(this);
    this.scrollToMessage = this.scrollToMessage.bind(this);
  }

  componentDidMount() {
    this.isMobSaf = isMobileSafari();
  }

  componentDidUpdate(prevProps) {
    // Update focusedInput in case a new value for it is
    // passed in the props. This may occur if the focus
    // is manually set to the date picker.
    if (
      this.props.stripePayoutsDisabled &&
      this.props.stripePayoutsDisabled !== prevProps.stripePayoutsDisabled
    ) {
      this.setState({ showStripeExpressModal: !this.state.showStripeExpressModal });
    }
  }

  onSendMessageFormFocus() {
    this.setState({ sendMessageFormFocused: true });
    if (this.isMobSaf) {
      // Scroll to bottom
      window.scroll({ top: document.body.scrollHeight, left: 0, behavior: 'smooth' });
    }
  }

  onSendMessageFormBlur() {
    this.setState({ sendMessageFormFocused: false });
  }

  onMessageSubmit(values, form) {
    const message = values.message ? values.message.trim() : null;
    const { transactionId, onSendMessage, config } = this.props;

    if (!message) {
      return;
    }
    onSendMessage(transactionId, message, config)
      .then(messageId => {
        form.reset();
        this.scrollToMessage(messageId);
        sendPushNotification({
          pushNotificationCode: PushNotificationCodeEnum.Message,
          transactionId: transactionId.uuid,
          params: {
            message,
          },
        })
          .then(res => {
            console.log(res);
          })
          .catch(err => {
            console.error(err);
          });
      })
      .catch(e => {
        // Ignore, Redux handles the error
      });
  }

  scrollToMessage(messageId) {
    const selector = `#msg-${messageId.uuid}`;
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    }
  }

  render() {
    const {
      rootClassName,
      className,
      currentUser,
      transactionRole,
      booking,
      listing,
      customer,
      provider,
      hasTransitions,
      protectedData,
      metadata,
      messages,
      initialMessageFailed,
      savePaymentMethodFailed,
      fetchMessagesError,
      sendMessageInProgress,
      sendMessageError,
      onOpenDisputeModal,
      intl,
      stateData,
      showBookingLocation,
      activityFeed,
      isInquiryProcess,
      orderBreakdown,
      orderPanel,
      config,
      transactionId,
      lastTransition,
      onManageDisableScrolling,
    } = this.props;

    // Removed sensitive protectedData logging for security

    const isCustomer = transactionRole === 'customer';
    const isProvider = transactionRole === 'provider';

    const listingDeleted = !!listing?.attributes?.deleted;
    const isCustomerBanned = !!customer?.attributes?.banned;
    const isCustomerDeleted = !!customer?.attributes?.deleted;
    const isProviderBanned = !!provider?.attributes?.banned;
    const isProviderDeleted = !!provider?.attributes?.deleted;

    const { authorDisplayName, customerDisplayName, otherUserDisplayNameString } = displayNames(
      currentUser,
      provider,
      customer,
      intl
    );

    const deletedListingTitle = intl.formatMessage({
      id: 'TransactionPanel.deletedListingTitle',
    });

    const listingTitle = listingDeleted ? deletedListingTitle : listing?.attributes?.title;
    const firstImage = listing?.images?.length > 0 ? listing?.images[0] : null;

    const actionButtons = (
      <ActionButtonsMaybe
        showButtons={stateData.showActionButtons}
        primaryButtonProps={stateData?.primaryButtonProps}
        secondaryButtonProps={stateData?.secondaryButtonProps}
        isListingDeleted={listingDeleted}
        isProvider={isProvider}
      />
    );

    const listingType = listing?.attributes?.publicData?.listingType;
    const listingTypeConfigs = config.listing.listingTypes;
    const listingTypeConfig = listingTypeConfigs.find(conf => conf.listingType === listingType);
    const showPrice = isInquiryProcess && displayPrice(listingTypeConfig);

    const showSendMessageForm =
      !isCustomerBanned && !isCustomerDeleted && !isProviderBanned && !isProviderDeleted;

    const deliveryMethod = protectedData?.deliveryMethod || 'none';
    const shippingStatus = metadata?.shippingStatus;
    const securityDepositStatus = metadata?.securityDepositStatus;

    // Removed detailed status logging to reduce console noise

    const classes = classNames(rootClassName || css.root, className);

    const refundSecurityDepositButton = securityDepositStatus && (
      <RefundSecurityDepositButtonMaybe
        transactionId={transactionId}
        isProvider={isProvider}
        securityDepositStatus={securityDepositStatus}
        intl={intl}
      />
    );

    const isValidShippingTransition =
      lastTransition === transitions.ACCEPT ||
      lastTransition === transitions.COMPLETE ||
      lastTransition === transitions.OPERATOR_COMPLETE ||
      lastTransition === transitions.REVIEW_1_BY_PROVIDER ||
      lastTransition === transitions.REVIEW_2_BY_PROVIDER ||
      lastTransition === transitions.REVIEW_1_BY_CUSTOMER ||
      lastTransition === transitions.REVIEW_2_BY_CUSTOMER ||
      lastTransition === transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD ||
      lastTransition === transitions.EXPIRE_PROVIDER_REVIEW_PERIOD ||
      lastTransition === transitions.EXPIRE_REVIEW_PERIOD;

    const shippingFunctionButton =
      deliveryMethod === DeliveryMethodEnum.Shipping && isValidShippingTransition ? (
        <ShippingFunctionButtonsMaybe
          transactionId={transactionId}
          isProvider={isProvider}
          isCustomer={isCustomer}
          shippingStatus={shippingStatus}
        />
      ) : null;

    return (
      <div className={classes}>
        <div className={css.container}>
          <div className={css.txInfo}>
            <DetailCardImage
              rootClassName={css.imageWrapperMobile}
              avatarWrapperClassName={css.avatarWrapperMobile}
              listingTitle={listingTitle}
              image={firstImage}
              provider={provider}
              isCustomer={isCustomer}
              listingImageConfig={config.layout.listingImage}
            />
            {isProvider ? (
              <div className={css.avatarWrapperProviderDesktop}>
                <AvatarLarge user={customer} className={css.avatarDesktop} />
              </div>
            ) : null}

            <PanelHeading
              processName={stateData.processName}
              processState={stateData.processState}
              showExtraInfo={stateData.showExtraInfo}
              showPriceOnMobile={showPrice}
              price={listing?.attributes?.price}
              intl={intl}
              deliveryMethod={deliveryMethod}
              isPendingPayment={!!stateData.isPendingPayment}
              transactionRole={transactionRole}
              providerName={authorDisplayName}
              customerName={customerDisplayName}
              isCustomerBanned={isCustomerBanned}
              listingId={listing?.id?.uuid}
              listingTitle={listingTitle}
              listingDeleted={listingDeleted}
            />

            <InquiryMessageMaybe
              protectedData={protectedData}
              showInquiryMessage={isInquiryProcess}
              isCustomer={isCustomer}
            />

            {!isInquiryProcess ? (
              <div className={css.orderDetails}>
                <div className={css.orderDetailsMobileSection}>
                  <BreakdownMaybe
                    orderBreakdown={orderBreakdown}
                    processName={stateData.processName}
                  />
                  <DiminishedActionButtonMaybe
                    showDispute={stateData.showDispute}
                    onOpenDisputeModal={onOpenDisputeModal}
                  />
                </div>

                {savePaymentMethodFailed ? (
                  <p className={css.genericError}>
                    <FormattedMessage
                      id="TransactionPanel.savePaymentMethodFailed"
                      values={{
                        paymentMethodsPageLink: (
                          <NamedLink name="PaymentMethodsPage">
                            <FormattedMessage id="TransactionPanel.paymentMethodsPageLink" />
                          </NamedLink>
                        ),
                      }}
                    />
                  </p>
                ) : null}
                <DeliveryInfoMaybe
                  className={css.deliveryInfoSection}
                  protectedData={protectedData}
                  listing={listing}
                  locale={config.localization.locale}
                />
                <BookingLocationMaybe
                  className={css.deliveryInfoSection}
                  listing={listing}
                  showBookingLocation={showBookingLocation}
                />
              </div>
            ) : null}

            {refundSecurityDepositButton && (
              <div className={css.mobileActionButtons}>{refundSecurityDepositButton}</div>
            )}
            {shippingFunctionButton && (
              <div className={css.mobileActionButtons}>{shippingFunctionButton}</div>
            )}

            <FeedSection
              rootClassName={css.feedContainer}
              hasMessages={messages.length > 0}
              hasTransitions={hasTransitions}
              fetchMessagesError={fetchMessagesError}
              initialMessageFailed={initialMessageFailed}
              activityFeed={activityFeed}
              isConversation={isInquiryProcess}
            />
            {showSendMessageForm ? (
              <SendMessageForm
                formId={this.sendMessageFormName}
                rootClassName={css.sendMessageForm}
                messagePlaceholder={intl.formatMessage(
                  { id: 'TransactionPanel.sendMessagePlaceholder' },
                  { name: otherUserDisplayNameString }
                )}
                inProgress={sendMessageInProgress}
                sendMessageError={sendMessageError}
                onFocus={this.onSendMessageFormFocus}
                onBlur={this.onSendMessageFormBlur}
                onSubmit={this.onMessageSubmit}
              />
            ) : (
              <div className={css.sendingMessageNotAllowed}>
                <FormattedMessage id="TransactionPanel.sendingMessageNotAllowed" />
              </div>
            )}

            {stateData.showActionButtons ? (
              <>
                <div className={css.mobileActionButtonSpacer}></div>
                <div className={css.mobileActionButtons}>{actionButtons}</div>
              </>
            ) : null}
          </div>

          <div className={css.asideDesktop}>
            <div className={css.stickySection}>
              <div className={css.detailCard}>
                <DetailCardImage
                  avatarWrapperClassName={css.avatarWrapperDesktop}
                  listingTitle={listingTitle}
                  image={firstImage}
                  provider={provider}
                  isCustomer={isCustomer}
                  listingImageConfig={config.layout.listingImage}
                />

                <DetailCardHeadingsMaybe
                  showDetailCardHeadings={stateData.showDetailCardHeadings}
                  listingTitle={
                    listingDeleted ? (
                      listingTitle
                    ) : (
                      <NamedLink
                        name="ListingPage"
                        params={{ id: listing.id?.uuid, slug: createSlug(listingTitle) }}
                      >
                        {listingTitle}
                      </NamedLink>
                    )
                  }
                  showPrice={showPrice}
                  price={listing?.attributes?.price}
                  intl={intl}
                />
                {stateData.showOrderPanel ? orderPanel : null}
                <BreakdownMaybe
                  className={css.breakdownContainer}
                  orderBreakdown={orderBreakdown}
                  processName={stateData.processName}
                />

                {stateData.showActionButtons ? (
                  <div className={css.desktopActionButtons}>{actionButtons}</div>
                ) : null}
                {refundSecurityDepositButton && (
                  <div className={css.desktopActionButtons}>{refundSecurityDepositButton}</div>
                )}
                {shippingFunctionButton && (
                  <div className={css.desktopActionButtons}>{shippingFunctionButton}</div>
                )}
              </div>
              <DiminishedActionButtonMaybe
                showDispute={stateData.showDispute}
                onOpenDisputeModal={onOpenDisputeModal}
              />
            </div>
          </div>
        </div>
        <Modal
          id="TransactionPanel.stripeExpressModal"
          isOpen={this.state.showStripeExpressModal}
          onClose={() => {
            this.setState({ showStripeExpressModal: false });
          }}
          usePortal={true}
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <StripeExpressStatusBox transactionId={transactionId} />
        </Modal>
      </div>
    );
  }
}

TransactionPanelComponent.defaultProps = {
  rootClassName: null,
  className: null,
  currentUser: null,
  booking: null,
  listing: null,
  customer: null,
  provider: null,
  hasTransitions: false,
  fetchMessagesError: null,
  initialMessageFailed: false,
  savePaymentMethodFailed: false,
  sendMessageError: null,
  sendReviewError: null,
  stateData: {},
  activityFeed: null,
  showBookingLocation: false,
  orderBreakdown: null,
  orderPanel: null,
};

TransactionPanelComponent.propTypes = {
  rootClassName: string,
  className: string,

  currentUser: propTypes.currentUser,
  transactionRole: oneOf(['customer', 'provider']).isRequired,
  booking: propTypes.booking,
  listing: propTypes.listing,
  customer: propTypes.user,
  provider: propTypes.user,
  hasTransitions: bool,
  transactionId: propTypes.uuid.isRequired,
  messages: arrayOf(propTypes.message).isRequired,
  initialMessageFailed: bool,
  savePaymentMethodFailed: bool,
  fetchMessagesError: propTypes.error,
  sendMessageInProgress: bool.isRequired,
  sendMessageError: propTypes.error,
  onOpenDisputeModal: func.isRequired,
  onSendMessage: func.isRequired,
  stateData: stateDataShape,
  showBookingLocation: bool,
  activityFeed: node,
  orderBreakdown: node,
  orderPanel: node,
  config: object.isRequired,

  // from injectIntl
  intl: intlShape,
};

const TransactionPanel = injectIntl(TransactionPanelComponent);

export default TransactionPanel;
