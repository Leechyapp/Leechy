import React, { useState } from 'react';
import NamedLink from '../NamedLink/NamedLink';
import css from './NativeBottomNavbar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import IsNativePlatform from '../../util/isNativePlatform';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import Modal from '../Modal/Modal';
import TopbarMobileMenu from '../../containers/TopbarContainer/Topbar/TopbarMobileMenu/TopbarMobileMenu';
import { authenticationInProgress, logout } from '../../ducks/auth.duck';
import appSettings from '../../config/settings';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { pathByRouteName } from '../../util/routes';
import {
  getResolvedCurrentPage,
  getResolvedCustomLinks,
  redirectToURLWithoutModalState,
  sortCustomLinks,
} from '../../containers/TopbarContainer/Topbar/Topbar';
import { propTypes } from '../../util/types';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import { intlShape } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';

const NativeBottomNavbar = injectIntl(props => {
  if (!IsNativePlatform) {
    return null;
  }

  const { intl, currentPage = 'LandingPage' } = props;

  const state = useSelector(state => state);
  const {
    isAuthenticated,
    currentUser,
    currentUserNotificationCount: notificationCount,
  } = state.user;

  const authInProgress = authenticationInProgress(state);
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentUserHasListings = true;
  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;

  // Custom links are sorted so that group="primary" are always at the beginning of the list.
  const sortedCustomLinks = sortCustomLinks(config.topbar?.customLinks);
  const customLinks = getResolvedCustomLinks(sortedCustomLinks, routeConfiguration);
  const resolvedCurrentPage = currentPage; // || getResolvedCurrentPage(location, routeConfiguration);

  const handleMobileMenuOpen = () => {
    redirectToURLWithoutModalState(
      {
        history: history,
        location: window.location,
      },
      'mobilemenu'
    );
  };

  const handleLogout = () => {
    dispatch(logout(historyPush)).then(() => {
      const path = pathByRouteName('LandingPage', routeConfiguration);

      // In production we ensure that data is really lost,
      // but in development mode we use stored values for debugging
      if (appSettings.dev) {
        history.push(path);
      } else if (typeof window !== 'undefined') {
        window.location = path;
      }

      console.log('logged out'); // eslint-disable-line
    });
  };

  const mobileMenu = (
    <TopbarMobileMenu
      isAuthenticated={isAuthenticated}
      currentUserHasListings={currentUserHasListings}
      currentUser={currentUser}
      onLogout={handleLogout}
      notificationCount={notificationCount}
      currentPage={resolvedCurrentPage}
      customLinks={customLinks}
    />
  );

  return (
    <nav className={css.mobileNav}>
      <NamedLink name="LandingPage" className={css.blocIcon}>
        <FontAwesomeIcon className={css.icon} icon={'fas fa-home'} />
        <p className={css.text}>
          <FormattedMessage id="NativeBottomNavbar.menuItem.home" />
        </p>
      </NamedLink>
      <NamedLink name="SearchPage" className={css.blocIcon}>
        <FontAwesomeIcon className={css.icon} icon={'fas fa-search'} />
        <p className={css.text}>
          <FormattedMessage id="NativeBottomNavbar.menuItem.search" />
        </p>
      </NamedLink>
      <NamedLink
        name="InboxPage"
        params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        className={css.blocIcon}
      >
        <FontAwesomeIcon className={css.icon} icon={'fa fa-fw fa-envelope-open'} />
        <p className={css.text}>
          <FormattedMessage id="NativeBottomNavbar.menuItem.inbox" />
        </p>
        {notificationDot}
      </NamedLink>
      <NamedLink
        name="ProfileSettingsPage"
        params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        className={css.blocIcon}
      >
        <FontAwesomeIcon className={css.icon} icon={'fas fa-user-circle'} />
        <p className={css.text}>
          <FormattedMessage id="NativeBottomNavbar.menuItem.profile" />
        </p>
      </NamedLink>
      <a onClick={() => setIsMobileMenuOpen(true)} className={css.blocIcon}>
        <FontAwesomeIcon className={css.icon} icon="fa-solid fa-bars" />
        <p className={css.text}>
          <FormattedMessage id="NativeBottomNavbar.menuItem.more" />
        </p>
      </a>

      <Modal
        id="TopbarMobileMenu"
        containerClassName={css.modalContainer}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        usePortal={true}
        onManageDisableScrolling={onManageDisableScrolling}
      >
        {authInProgress ? null : mobileMenu}
      </Modal>
    </nav>
  );
});

NativeBottomNavbar.propTypes = {
  currentUser: propTypes.string,
  intl: intlShape.isRequired,
};

export default NativeBottomNavbar;
