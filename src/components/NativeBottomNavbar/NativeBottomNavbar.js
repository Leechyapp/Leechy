import React from 'react';
import NamedLink from '../NamedLink/NamedLink';
import css from './NativeBottomNavbar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const NativeBottomNavbar = () => {
  const currentUserHasListings = true;
  return (
    <nav className={css.mobileNav}>
      <NamedLink name="LandingPage" className={css.blocIcon}>
        <FontAwesomeIcon icon={'fas fa-home'} />
        <p className="text">Home</p>
      </NamedLink>
      <NamedLink name="SearchPage" className={css.blocIcon}>
        <FontAwesomeIcon icon={'fas fa-search'} />
        <p className="text">Search</p>
      </NamedLink>
      <NamedLink
        name="InboxPage"
        params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        className={css.blocIcon}
      >
        <FontAwesomeIcon icon={'fa fa-fw fa-envelope-open'} />
        <p className="text">Inbox</p>
      </NamedLink>
      <a href="native-platform-menu" className={css.blocIcon}>
        <FontAwesomeIcon icon={'fas fa-user-circle'} />
        <p className="text">Profile</p>
      </a>
    </nav>
  );
};

export default NativeBottomNavbar;
