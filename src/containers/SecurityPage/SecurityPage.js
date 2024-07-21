import React, { useEffect, useState } from 'react';
import { bool } from 'prop-types';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl.js';
import {
  H3,
  Page,
  UserNav,
  LayoutSideNavigation,
  SecondaryButton,
  Modal,
  H4,
  NamedLink,
} from '../../components/index.js';
import TopbarContainer from '../TopbarContainer/TopbarContainer.js';
import FooterContainer from '../FooterContainer/FooterContainer.js';
import css from './SecurityPage.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck.js';
import { deleteCurrentUser, getBlockedUsersList } from '../../util/api.js';
import { logout } from '../../ducks/auth.duck.js';

const SecurityPage = injectIntl(props => {
  const { intl } = props;
  const state = useSelector(state => state);
  const scrollingDisabled = isScrollingDisabled(state);
  const dispatch = useDispatch();
  const title = intl.formatMessage({ id: 'SecurityPage.title' });

  const [currentTab, setCurrentTab] = useState(1);
  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState();
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState(null);

  const [blockedUsersList, setBlockedUsersList] = useState();
  const [blockedUsersListLoading, setBlockedUsersListLoading] = useState(false);

  const tabClassActive = [css.tab, css.active].join(' ');

  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  useEffect(() => {
    if (currentTab === 2) {
      onFetchBlockedUsers();
    }
  }, [currentTab]);

  const onDeleteAccount = () => {
    setDeleteAccountError(null);
    setDeleteInProgress(true);
    deleteCurrentUser({ currentPassword })
      .then(res => {
        dispatch(logout()).then(() => {
          window.location.href = process.env.REACT_APP_MARKETPLACE_ROOT_URL;
        });
      })
      .catch(error => {
        if (error?.message) {
          setDeleteAccountError(error.message);
        }
        setDeleteInProgress(false);
      });
  };

  const onFetchBlockedUsers = () => {
    setBlockedUsersList(null);
    setBlockedUsersListLoading(true);
    getBlockedUsersList({})
      .then(res => {
        setBlockedUsersListLoading(false);
        setBlockedUsersList(res);
      })
      .catch(error => {
        setBlockedUsersListLoading(false);
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
          <div className={css.rowUnsetMarginLR}>
            <div className={css.col6}>
              <div
                className={currentTab === 1 ? tabClassActive : css.tab}
                onClick={() => setCurrentTab(1)}
              >
                Account deletion
              </div>
            </div>
            <div className={css.col6}>
              <div
                className={currentTab === 2 ? tabClassActive : css.tab}
                onClick={() => setCurrentTab(2)}
              >
                Blocked users
              </div>
            </div>
          </div>
          <br />
          {currentTab === 1 && (
            <div className={css.rowUnsetMarginLR}>
              <div className={css.col12}>
                <h6>Account deletion</h6>
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
            </div>
          )}
          {currentTab === 2 && (
            <div className={css.rowUnsetMarginLR}>
              <div className={css.col12}>
                <h6>Blocked users</h6>
              </div>
              <div className={css.col12}>
                {blockedUsersListLoading && <p>Loading...</p>}
                {blockedUsersList && blockedUsersList?.length === 0 && <p>No results.</p>}
                {blockedUsersList &&
                  blockedUsersList.map(user => (
                    <div className={css.blockedUserRow}>
                      <div className={css.rowUnsetMarginLR}>
                        <div className={css.col4}>
                          <strong>{user.attributes.profile.displayName}</strong>
                        </div>
                        <div className={css.col3}>
                          <NamedLink
                            className={css.editLinkMobile}
                            name="ProfilePage"
                            params={{ id: user.id.uuid }}
                          >
                            View profile
                          </NamedLink>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </LayoutSideNavigation>
      <Modal
        id="SendMessageForm.deleteAccountModal"
        isOpen={showAccountDeleteModal}
        onClose={() => setShowAccountDeleteModal(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <div className={css.rowUnsetMarginLR}>
          <div className={css.col12}>
            <br />
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
              {deleteAccountError && <p className={css.errorMessage}>{deleteAccountError}</p>}
            </form>
          </div>
        </div>
      </Modal>
    </Page>
  );
});

SecurityPage.defaultProps = {};

SecurityPage.propTypes = {
  scrollingDisabled: bool.isRequired,
  intl: intlShape.isRequired,
};

export default SecurityPage;
