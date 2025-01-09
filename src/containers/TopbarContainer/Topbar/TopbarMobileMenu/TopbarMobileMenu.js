/**
 *  TopbarMobileMenu prints the menu content for authenticated user or
 * shows login actions for those who are not authenticated.
 */
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../../util/reactIntl';
import { propTypes } from '../../../../util/types';
import { ensureCurrentUser } from '../../../../util/data';

import {
  AvatarLarge,
  ExternalLink,
  InlineTextButton,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import css from './TopbarMobileMenu.module.scss';
import BlockBuilder from '../../../PageBuilder/BlockBuilder';
import Field from '../../../PageBuilder/Field';
import isNativePlatform from '../../../../util/isNativePlatform';

const CustomLinkComponent = ({ linkConfig, currentPage }) => {
  const { group, text, type, href, route } = linkConfig;
  const getCurrentPageClass = page => {
    const hasPageName = name => currentPage?.indexOf(name) === 0;
    const isCMSPage = pageId => hasPageName('CMSPage') && currentPage === `${page}:${pageId}`;
    const isInboxPage = tab => hasPageName('InboxPage') && currentPage === `${page}:${tab}`;
    const isCurrentPage = currentPage === page;

    return isCMSPage(route?.params?.pageId) || isInboxPage(route?.params?.tab) || isCurrentPage
      ? css.currentPage
      : null;
  };

  // Note: if the config contains 'route' keyword,
  // then in-app linking config has been resolved already.
  if (type === 'internal' && route) {
    // Internal link
    const { name, params, to } = route || {};
    const className = classNames(css.navigationLink, getCurrentPageClass(name));
    return (
      <NamedLink name={name} params={params} to={to} className={className}>
        <span className={css.menuItemBorder} />
        {text}
      </NamedLink>
    );
  }
  return (
    <ExternalLink href={href} className={css.navigationLink}>
      <span className={css.menuItemBorder} />
      {text}
    </ExternalLink>
  );
};

const TopbarMobileMenu = props => {
  const {
    isAuthenticated,
    currentPage,
    currentUserHasListings,
    currentUser,
    notificationCount,
    customLinks,
    onLogout,
  } = props;

  const user = ensureCurrentUser(currentUser);

  const extraLinks = customLinks.map(linkConfig => {
    return (
      <CustomLinkComponent
        key={linkConfig.text}
        linkConfig={linkConfig}
        currentPage={currentPage}
      />
    );
  });

  if (!isAuthenticated) {
    const signup = (
      <NamedLink name="SignupPage" className={css.signupLink}>
        <FormattedMessage id="TopbarMobileMenu.signupLink" />
      </NamedLink>
    );

    const login = (
      <NamedLink name="LoginPage" className={css.loginLink}>
        <FormattedMessage id="TopbarMobileMenu.loginLink" />
      </NamedLink>
    );

    const signupOrLogin = (
      <span className={css.authenticationLinks}>
        <FormattedMessage id="TopbarMobileMenu.signupOrLogin" values={{ signup, login }} />
      </span>
    );
    return (
      <div className={css.root}>
        <div className={css.content}>
          <div className={css.authenticationGreeting}>
            <FormattedMessage
              id="TopbarMobileMenu.unauthorizedGreeting"
              values={{ lineBreak: <br />, signupOrLogin }}
            />
          </div>

          <div className={css.customLinksWrapper}>{extraLinks}</div>

          <div className={css.spacer} />
        </div>
        <div className={css.footer}>
          <NamedLink className={css.createNewListingLink} name="NewListingPage">
            <FormattedMessage id="TopbarMobileMenu.newListingLink" />
          </NamedLink>
        </div>
      </div>
    );
  }

  const notificationCountBadge =
    notificationCount > 0 ? (
      <NotificationBadge className={css.notificationBadge} count={notificationCount} />
    ) : null;

  const displayName = user.attributes.profile.firstName;
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage = currentPage?.indexOf('InboxPage') === 0 && page?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage ? css.currentPage : null;
  };
  const inboxTab = currentUserHasListings ? 'sales' : 'orders';

  const linksWithBlockId = [
    {
      link: {
        fieldType: 'socialMediaLink',
        platform: 'facebook',
        url: 'https://www.facebook.com/profile.php?id=61567796655532&mibextid=LQQJ4d',
      },
      blockType: 'socialMediaLink',
      blockId: 'facebook',
    },
    {
      link: {
        fieldType: 'socialMediaLink',
        platform: 'instagram',
        url: 'https://www.instagram.com/leechyapp/',
      },
      blockType: 'socialMediaLink',
      blockId: 'instagram',
    },
    {
      link: {
        fieldType: 'socialMediaLink',
        platform: 'twitter',
        url: 'https://x.com/leechyapp',
      },
      blockType: 'socialMediaLink',
      blockId: 'twitter',
    },
    {
      link: {
        fieldType: 'socialMediaLink',
        platform: 'linkedin',
        url:
          'https://www.linkedin.com/in/leechy-app-a748a3336?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app',
      },
      blockType: 'socialMediaLink',
      blockId: 'linkedin',
    },
    {
      link: {
        fieldType: 'socialMediaLink',
        platform: 'youtube',
        url: 'https://youtube.com/@leechyapp?si=eBAartczv1pXiq8Z',
      },
      blockType: 'socialMediaLink',
      blockId: 'youtube',
    },
    {
      link: {
        fieldType: 'socialMediaLink',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@leechyapp?_t=8r8LB7pICf0&_r=1',
      },
      blockType: 'socialMediaLink',
      blockId: 'tiktok',
    },
  ];

  const copyright = {
    content: '© 2024 Leechy LLC. All rights reserved.',
    fieldType: 'text',
  };

  return (
    <div className={css.root}>
      <AvatarLarge className={css.avatar} user={currentUser} />
      <div className={css.content}>
        <span className={css.greeting}>
          <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
        </span>
        <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
          <FormattedMessage id="TopbarMobileMenu.logoutLink" />
        </InlineTextButton>

        <div className={css.accountLinksWrapper}>
          <NamedLink
            className={classNames(css.inbox, currentPageClass(`InboxPage:${inboxTab}`))}
            name="InboxPage"
            params={{ tab: inboxTab }}
          >
            <FormattedMessage id="TopbarMobileMenu.inboxLink" />
            {notificationCountBadge}
          </NamedLink>
          <NamedLink
            className={classNames(css.navigationLink, currentPageClass('ManageListingsPage'))}
            name="ManageListingsPage"
          >
            <FormattedMessage id="TopbarMobileMenu.yourListingsLink" />
          </NamedLink>
          <NamedLink
            className={classNames(css.navigationLink, currentPageClass('ProfileSettingsPage'))}
            name="ProfileSettingsPage"
          >
            <FormattedMessage id="TopbarMobileMenu.profileSettingsLink" />
          </NamedLink>
          <NamedLink
            className={classNames(css.navigationLink, currentPageClass('AccountSettingsPage'))}
            name="AccountSettingsPage"
          >
            <FormattedMessage id="TopbarMobileMenu.accountSettingsLink" />
          </NamedLink>
          <NamedLink
            className={classNames(css.navigationLink, currentPageClass('SecurityPage'))}
            name="StripeEarningsPage"
          >
            <FormattedMessage id="TopbarMobileMenu.earningsLink" />
          </NamedLink>
          <NamedLink
            className={classNames(css.navigationLink, currentPageClass('SecurityPage'))}
            name="SecurityPage"
          >
            <FormattedMessage id="TopbarMobileMenu.securitySettingsLink" />
          </NamedLink>
        </div>
        <div className={css.customLinksWrapper}>
          {!isNativePlatform && { extraLinks }}
          {isNativePlatform && (
            <>
              <NamedLink
                className={classNames(css.navigationLink, currentPageClass('CMSAboutPage'))}
                name="CMSPage"
                params={{ pageId: 'about' }}
              >
                <FormattedMessage id="TopbarMobileMenu.aboutLink" />
              </NamedLink>
              <NamedLink
                className={classNames(css.navigationLink, currentPageClass('CMSContactUsPage'))}
                name="CMSPage"
                params={{ pageId: 'contact-us' }}
              >
                <FormattedMessage id="TopbarMobileMenu.contactUsLink" />
              </NamedLink>
            </>
          )}
        </div>
        {isNativePlatform && (
          <>
            <div className={css.legalLinksWrapper}>
              <NamedLink
                className={classNames(css.navigationLink, currentPageClass('TermsOfServicePage'))}
                name="TermsOfServicePage"
              >
                <FormattedMessage id="TopbarMobileMenu.tosLink" />
              </NamedLink>
              <NamedLink
                className={classNames(css.navigationLink, currentPageClass('PrivacyPolicyPage'))}
                name="PrivacyPolicyPage"
              >
                <FormattedMessage id="TopbarMobileMenu.privacyPolicyLink" />
              </NamedLink>
            </div>
            <div className={css.legalLinksWrapper}>
              <div className={css.icons}>
                <BlockBuilder blocks={linksWithBlockId} sectionId={'footer'} options={{}} />
              </div>
              <Field data={copyright} className={css.copyright} />
            </div>
          </>
        )}
        <div className={css.spacer} />
      </div>
      <div className={css.footer}>
        <NamedLink className={css.createNewListingLink} name="NewListingPage">
          <FormattedMessage id="TopbarMobileMenu.newListingLink" />
        </NamedLink>
      </div>
    </div>
  );
};

TopbarMobileMenu.defaultProps = { currentUser: null, notificationCount: 0, currentPage: null };

const { bool, func, number, string } = PropTypes;

TopbarMobileMenu.propTypes = {
  isAuthenticated: bool.isRequired,
  currentUserHasListings: bool.isRequired,
  currentUser: propTypes.currentUser,
  currentPage: string,
  notificationCount: number,
  onLogout: func.isRequired,
};

export default TopbarMobileMenu;
