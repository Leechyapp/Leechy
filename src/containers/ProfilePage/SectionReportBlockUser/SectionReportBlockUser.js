import React from 'react';
import { useState } from 'react';
import css from './SectionReportBlockUser.module.scss';
import { Modal, NamedLink, SecondaryButton } from '../../../components';
import { isScrollingDisabled, manageDisableScrolling } from '../../../ducks/ui.duck';
import { useDispatch, useSelector } from 'react-redux';
import { blockUser, sendContactEmail } from '../../../util/api';
import { fetchCurrentUser } from '../../../ducks/user.duck';
import { propTypes } from '../../../util/types';
import { func, shape } from 'prop-types';
import { FormattedMessage } from 'react-intl';

const SectionReportBlockUser = props => {
  const { profileUser } = props;
  if (!profileUser) {
    return null;
  }
  const profileUUID = profileUser?.id?.uuid;

  const state = useSelector(state => state);
  const isAuthenticated = state?.auth?.isAuthenticated;

  const scrollingDisabled = isScrollingDisabled(state);
  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [reportProfileModalOpen, setReportProfileModalOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const onReportProfile = reasonForReporting => {
    return sendContactEmail({ profileUUID, reasonForReporting })
      .then(res => {
        setReportSubmitted(true);
      })
      .catch(e => console.log(e));
  };

  const onBlockUser = () => {
    blockUser({ userToBlockUUID: profileUUID })
      .then(() => {
        dispatch(fetchCurrentUser());
      })
      .catch(error => {
        console.error(error);
      });
  };

  return (
    <div className={css.container}>
      <div className={css.rowUnsetMarginLR}>
        <div className={css.col12}>
          {isAuthenticated ? (
            <p className={css.reportLink} onClick={() => setReportProfileModalOpen(true)}>
              <FormattedMessage id="SectionReportBlockUser.reportProfile.button" />
            </p>
          ) : (
            <p className={css.reportLink}>
              <NamedLink name="LoginPage">
                <FormattedMessage id="SectionReportBlockUser.reportProfile.button" />
              </NamedLink>
            </p>
          )}
        </div>
        <div className={css.col12}>
          {isAuthenticated ? (
            <p className={css.blockLink} onClick={() => onBlockUser()}>
              <FormattedMessage id="SectionReportBlockUser.blockUser.button" />
            </p>
          ) : (
            <p className={css.blockLink}>
              <NamedLink name="LoginPage">
                <FormattedMessage id="SectionReportBlockUser.blockUser.button" />
              </NamedLink>
            </p>
          )}
        </div>
      </div>
      <Modal
        id="SendMessageForm.reportProfileModal"
        isOpen={reportProfileModalOpen}
        onClose={() => setReportProfileModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <div className={css.rowUnsetMarginLR}>
          {reportSubmitted ? (
            <div className={css.col12}>
              <br />
              <p className={css.mobileMarginTop}>
                <FormattedMessage id="SectionReportBlockUser.reportProfile.message" />
              </p>
            </div>
          ) : (
            <div className={css.col12}>
              <br />
              <form className={css.mobileMarginTop}>
                <SecondaryButton
                  className={css.submitButton}
                  onClick={() => onReportProfile(1)}
                  type="button"
                >
                  <FormattedMessage id="SectionReportBlockUser.report.objectionableContent.button" />
                </SecondaryButton>
                <SecondaryButton
                  className={css.submitButton}
                  onClick={() => onReportProfile(2)}
                  type="button"
                >
                  <FormattedMessage id="SectionReportBlockUser.report.spam.button" />
                </SecondaryButton>
                <SecondaryButton
                  className={css.submitButton}
                  onClick={() => onReportProfile(3)}
                  type="button"
                >
                  <FormattedMessage id="SectionReportBlockUser.report.deceptiveContent.button" />
                </SecondaryButton>
                <SecondaryButton
                  className={css.submitButton}
                  onClick={() => onReportProfile(4)}
                  type="button"
                >
                  <FormattedMessage id="SectionReportBlockUser.report.shouldBeRemoved.button" />
                </SecondaryButton>
              </form>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

SectionReportBlockUser.propTypes = {
  profileUser: propTypes.user,
  history: shape({
    push: func.isRequired,
  }).isRequired,
};

export default SectionReportBlockUser;
