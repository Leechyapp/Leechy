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
import isIOSPlatform from '../../util/isIOSPlatform';

const NativeBottomNavbar = injectIntl(props => {
  if (!IsNativePlatform) {
    return null;
  }

  const { currentPage = 'LandingPage' } = props;

  const state = useSelector(state => state);
  const { currentUser, currentUserNotificationCount: notificationCount } = state.user;
  const { isAuthenticated } = state.auth;

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
    dispatch(logout()).then(() => {
      const path = pathByRouteName('LandingPage', routeConfiguration);
      if (typeof window !== 'undefined') {
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

  const rootClasses = isIOSPlatform ? css.mobileNavIOS : css.mobileNav;

  return (
    <nav className={rootClasses}>
      <NamedLink name="LandingPage" className={css.navButton}>
        <div className={css.floatingButton}>
          <FontAwesomeIcon className={css.navIcon} icon={'fas fa-home'} />
        </div>
      </NamedLink>
      <NamedLink name="SearchPage" className={css.navButton}>
        <div className={css.floatingButton}>
          <FontAwesomeIcon className={css.navIcon} icon={'fas fa-search'} />
        </div>
      </NamedLink>
      <NamedLink name="NewListingPage" className={css.navButton}>
        <div className={css.floatingButton}>
          <FontAwesomeIcon className={css.navIcon} icon={'fas fa-plus'} />
        </div>
      </NamedLink>
      {isAuthenticated && currentUser?.id?.uuid ? (
        <NamedLink name="ProfilePage" params={{ id: currentUser.id.uuid }} className={css.navButton}>
          <div className={css.floatingButton}>
            <FontAwesomeIcon className={css.navIcon} icon={'fas fa-user-circle'} />
          </div>
        </NamedLink>
      ) : (
        <NamedLink name="LoginPage" className={css.navButton}>
          <div className={css.floatingButton}>
            <FontAwesomeIcon className={css.navIcon} icon={'fas fa-user-circle'} />
          </div>
        </NamedLink>
      )}
      <a onClick={() => setIsMobileMenuOpen(true)} className={css.navButton}>
        <div className={css.floatingButton}>
          <FontAwesomeIcon className={css.navIcon} icon="fa-solid fa-bars" />
        </div>
      </a>

      <Modal
        id="TopbarMobileMenu"
        scrollLayerClassName={css.scrollLayerClassName}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        usePortal={false}
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
