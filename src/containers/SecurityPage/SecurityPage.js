import React, { useState } from 'react';
import { bool } from 'prop-types';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl.js';
import {
  H3,
  Page,
  UserNav,
  LayoutSideNavigation,
  SecondaryButton,
  Modal,
} from '../../components/index.js';
import TopbarContainer from '../TopbarContainer/TopbarContainer.js';
import FooterContainer from '../FooterContainer/FooterContainer.js';
import css from './SecurityPage.module.css';
import { useDispatch } from 'react-redux';
import { manageDisableScrolling } from '../../ducks/ui.duck.js';
import { deleteCurrentUser } from '../../util/api.js';
import { logout } from '../../ducks/auth.duck.js';

const SecurityPage = injectIntl(props => {
  const { scrollingDisabled, intl } = props;
  const dispatch = useDispatch();
  const title = intl.formatMessage({ id: 'SecurityPage.title' });

  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState();
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const onDeleteAccount = () => {
    setDeleteInProgress(true);
    deleteCurrentUser({ currentPassword })
      .then(res => {
        dispatch(logout()).then(() => {
          window.location.href = process.env.REACT_APP_MARKETPLACE_ROOT_URL;
        });
      })
      .catch(error => {
        setDeleteInProgress(false);
      });
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
            <UserNav currentPage="SecurityPage" />
          </>
        }
        sideNav={null}
        useAccountSettingsNav
        currentPage="SecurityPage"
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <H3 as="h1">
            <FormattedMessage id="SecurityPage.heading" />
          </H3>
          <p>
            <FormattedMessage id="SecurityPage.deleteAccount.message" />
          </p>
          <button
            className={css.deleteAccountButton}
            onClick={() => setShowAccountDeleteModal(true)}
          >
            <FormattedMessage id="SecurityPage.deleteAccount.button" />
          </button>
        </div>
        <Modal
          id="SendMessageForm.deleteAccountModal"
          isOpen={showAccountDeleteModal}
          onClose={() => setShowAccountDeleteModal(false)}
          usePortal={true}
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <form>
            <h4>Confirm Account Deletion</h4>
            <p>Once your account is deleted, it cannot be undone.</p>
            <label>Enter your password to confirm account deletion.</label>
            <input
              type="password"
              placeholder="Your password"
              onChange={e => setCurrentPassword(e.target.value)}
            />
            <br />
            <SecondaryButton
              className={css.submitButton}
              inProgress={deleteInProgress}
              disabled={!currentPassword}
              onClick={() => onDeleteAccount()}
              type="button"
            >
              Delete account
            </SecondaryButton>
          </form>
        </Modal>
      </LayoutSideNavigation>
    </Page>
  );
});

SecurityPage.defaultProps = {};

SecurityPage.propTypes = {
  scrollingDisabled: bool.isRequired,
  intl: intlShape.isRequired,
};

export default SecurityPage;
