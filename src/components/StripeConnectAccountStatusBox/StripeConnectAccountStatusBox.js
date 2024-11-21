import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import { IconEdit, IconSuccess, PrimaryButton, InlineTextButton } from '../../components';
import css from './StripeConnectAccountStatusBox.module.scss';
import { getSupportedCountryCodes } from '../StripeBankAccountTokenInputField/StripeBankAccountTokenInputField.util';
import { supportedCountries } from '../../config/configStripe';

const STATUS_VERIFICATION_NEEDED = 'verificationNeeded';
const STATUS_VERIFICATION_SUCCESS = 'verificationSuccess';
const STATUS_VERIFICATION_ERROR = 'verificationError';
const STATUS_VERIFICATION_NOT_STARTED = 'verificationNotStarted';

const StripeConnectAccountStatusBox = props => {
  const {
    intl,
    type,
    onGetStripeConnectAccountLink,
    inProgress,
    disabled,
    onChangeCountryCode,
    countryCode,
  } = props;

  if (type === STATUS_VERIFICATION_NEEDED) {
    return (
      <div className={classNames(css.verificiationBox, css.verficiationNeededBox)}>
        <div className={css.verificiationBoxTextWrapper}>
          <div className={css.verificationBoxTitle}>
            <FormattedMessage id="StripeConnectAccountStatusBox.verificationNeededTitle" />
          </div>
          <div className={css.verificationBoxText}>
            <FormattedMessage id="StripeConnectAccountStatusBox.verificationNeededText" />
          </div>
        </div>

        <PrimaryButton
          className={css.getVerifiedButton}
          spinnerClassName={css.spinner}
          type="button"
          inProgress={inProgress}
          disabled={disabled}
          onClick={onGetStripeConnectAccountLink}
        >
          <FormattedMessage id="StripeConnectAccountStatusBox.getVerifiedButton" />
        </PrimaryButton>
      </div>
    );
  } else if (type === STATUS_VERIFICATION_SUCCESS) {
    return (
      <div className={classNames(css.verificiationBox, css.verficiationSuccessBox)}>
        <div
          className={classNames(
            css.verificiationBoxTextWrapper,
            css.verificationBoxSuccessTextWrapper
          )}
        >
          <div className={css.verificationBoxTitle}>
            <IconSuccess className={css.icon} />
            <FormattedMessage id="StripeConnectAccountStatusBox.verificationSuccessTitle" />
          </div>
        </div>

        <InlineTextButton
          className={css.editVerificationButton}
          spinnerClassName={css.spinner}
          type="button"
          inProgress={inProgress}
          disabled={disabled}
          onClick={onGetStripeConnectAccountLink}
        >
          <IconEdit className={css.icon} pencilClassName={css.iconEditPencil} />
          <FormattedMessage id="StripeConnectAccountStatusBox.editAccountButton" />
        </InlineTextButton>
      </div>
    );
  } else if (type === STATUS_VERIFICATION_ERROR) {
    return (
      <div className={classNames(css.verificiationBox, css.verficiationErrorBox)}>
        <div className={css.verificiationBoxTextWrapper}>
          <div className={css.verificationBoxTitle}>
            <FormattedMessage id="StripeConnectAccountStatusBox.verificationFailedTitle" />
          </div>
          <div className={css.verificationBoxText}>
            <FormattedMessage id="StripeConnectAccountStatusBox.verificationFailedText" />
          </div>
        </div>

        <PrimaryButton
          className={css.getVerifiedButton}
          spinnerClassName={css.spinner}
          type="button"
          inProgress={inProgress}
          disabled={disabled}
          onClick={onGetStripeConnectAccountLink}
        >
          <FormattedMessage id="StripeConnectAccountStatusBox.getVerifiedButton" />
        </PrimaryButton>
      </div>
    );
  } else if (type === STATUS_VERIFICATION_NOT_STARTED) {
    return (
      <div className={classNames(css.verificiationBox, css.verficiationNeededBox)}>
        <div className={css.rowMarginLR}>
          <div className={css.col12}>
            <div className={css.verificationNotStartedTitle}>
              <FormattedMessage id="StripeConnectAccountStatusBox.verificationNotStartedTitle" />
            </div>
            <div className={css.verificationNotStartedText}>
              <FormattedMessage id="StripeConnectAccountStatusBox.verificationNotStartedText" />
            </div>
          </div>
          <form>
            <div className={css.col12}>
              <div className={css.selectCountry}>
                <label>{intl.formatMessage({ id: 'StripeConnectAccountForm.countryLabel' })}</label>
                <select
                  id="country"
                  name="country"
                  disabled={false}
                  autoComplete="country"
                  onChange={e => onChangeCountryCode(e.target.value)}
                  required={true}
                  value={countryCode}
                >
                  <option disabled value={''}>
                    {intl.formatMessage({ id: 'StripeConnectAccountForm.countryPlaceholder' })}
                  </option>
                  {getSupportedCountryCodes(supportedCountries).map(c => (
                    <option key={c} value={c}>
                      {intl.formatMessage({ id: `StripeConnectAccountForm.countryNames.${c}` })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={css.col12}>
              <PrimaryButton
                className={css.connectToStripeButton}
                spinnerClassName={css.spinner}
                type="button"
                inProgress={inProgress}
                disabled={!countryCode}
                onClick={onGetStripeConnectAccountLink}
              >
                <FormattedMessage id="StripeConnectAccountStatusBox.connectToStripeButton" />
              </PrimaryButton>
            </div>
          </form>
        </div>
      </div>
    );
  } else {
    throw new Error(`Unknown type ${type} for StripeConnectAccountStatusBox`);
  }
};

export default StripeConnectAccountStatusBox;
