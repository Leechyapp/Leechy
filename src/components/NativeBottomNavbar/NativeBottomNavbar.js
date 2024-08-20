import React from 'react';
import NamedLink from '../NamedLink/NamedLink';
import css from './NativeBottomNavbar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const NativeBottomNavbar = () => {
  const currentUserHasListings = true;
  return (
    <nav className={css.mobileNav}>
      <NamedLink name="LandingPage" className={css.blocIcon}>
        <FontAwesomeIcon className={css.icon} icon={'fas fa-home'} />
        <p className={css.text}>Home</p>
      </NamedLink>
      <NamedLink name="SearchPage" className={css.blocIcon}>
        <FontAwesomeIcon className={css.icon} icon={'fas fa-search'} />
        <p className={css.text}>Search</p>
      </NamedLink>
      <NamedLink
        name="InboxPage"
        params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        className={css.blocIcon}
      >
        <FontAwesomeIcon className={css.icon} icon={'fa fa-fw fa-envelope-open'} />
        <p className={css.text}>Inbox</p>
      </NamedLink>
      <NamedLink
        name="ProfileSettingsPage"
        params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        className={css.blocIcon}
      >
        <FontAwesomeIcon className={css.icon} icon={'fas fa-user-circle'} />
        <p className={css.text}>Profile</p>
      </NamedLink>
    </nav>
  );
};

export default NativeBottomNavbar;
