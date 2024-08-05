import React from 'react';
import NamedLink from '../NamedLink/NamedLink';
import css from './NativeBottomNavbar.module.scss';

const NativeBottomNavbar = () => {
  const currentUserHasListings = true;
  return (
    <nav className={css.mobileNav}>
      <NamedLink name="LandingPage" className={css.blocIcon}>
        <i className="far fa-calendar"></i>
        <p className="text">Home</p>
      </NamedLink>
      <NamedLink name="SearchPage" className={css.blocIcon}>
        <i className="fas fa-search"></i>
        <p className="text">Search</p>
      </NamedLink>
      <NamedLink
        name="InboxPage"
        params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        className={css.blocIcon}
      >
        <i className="fa fa-fw fa-envelope-open"></i>
        <p className="text">Inbox</p>
      </NamedLink>
      <a href="native-platform-menu" className={css.blocIcon}>
        <i className="fas fa-user-circle"></i>
        <p className="text">Profile</p>
      </a>
    </nav>
  );
};

export default NativeBottomNavbar;
