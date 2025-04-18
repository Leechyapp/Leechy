import React, { useEffect, useState } from 'react';
import { bool, arrayOf, number, shape } from 'prop-types';
import { compose } from 'redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import {
  REVIEW_TYPE_OF_PROVIDER,
  REVIEW_TYPE_OF_CUSTOMER,
  SCHEMA_TYPE_MULTI_ENUM,
  SCHEMA_TYPE_TEXT,
  propTypes,
} from '../../util/types';
import { ensureCurrentUser, ensureUser } from '../../util/data';
import { withViewport } from '../../util/uiHelpers';
import { pickCustomFieldProps } from '../../util/fieldHelpers';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import {
  Heading,
  H4,
  Page,
  AvatarLarge,
  ListingCard,
  Reviews,
  ButtonTabNavHorizontal,
  LayoutSideNavigation,
  Button,
  Modal,
  H3,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';

import css from './ProfilePage.module.scss';
import SectionDetailsMaybe from './SectionDetailsMaybe';
import SectionTextMaybe from './SectionTextMaybe';
import SectionMultiEnumMaybe from './SectionMultiEnumMaybe';
import SectionReportBlockUser from './SectionReportBlockUser/SectionReportBlockUser';
import { followUnfollowUser, unblockUser } from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';
import NativeBottomNavbar from '../../components/NativeBottomNavbar/NativeBottomNavbar';
import FollowsListTabs from '../../components/FollowsListTabs/FollowsListTabs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { FollowsEnum } from '../../enums/follows.enum';
import { fetchFollowersCountSuccess, fetchIsFollowingSuccess, loadData } from './ProfilePage.duck';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { pathByRouteName } from '../../util/routes';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh';

const MAX_MOBILE_SCREEN_WIDTH = 768;

const FollowersFollowingSection = props => {
  const { profileUser, displayName, user, isCurrentUser, profileBlocked, onUnblockUser } = props;

  const [showProfileMoreMenu, setShowProfileMoreMenu] = useState(false);

  const state = useSelector(state => state);
  const { followersCount, followingCount, isFollowing } = state.ProfilePage;
  const { isAuthenticated } = state.auth;

  const sharetribeProfileUserId = profileUser.id;

  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();
  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [selectedFollowsTab, setSelectedFollowsTab] = useState();
  const [followsModalOpen, setFollowsModalOpen] = useState(false);

  useEffect(() => {
    if (selectedFollowsTab) {
      if (followsModalOpen !== true) {
        setFollowsModalOpen(true);
      }
    }
  }, [selectedFollowsTab]);

  const onFollowUnfollow = () => {
    if (isAuthenticated) {
      followUnfollowUser({ sharetribeProfileUserId })
        .then(res => {
          if (res?.code === FollowsEnum.Unfollowed) {
            dispatch(fetchIsFollowingSuccess(false));
            const newFollowersCount = followersCount > 0 ? followersCount - 1 : 0;
            dispatch(fetchFollowersCountSuccess(newFollowersCount));
          } else if (res?.code === FollowsEnum.Followed) {
            dispatch(fetchIsFollowingSuccess(true));
            dispatch(fetchFollowersCountSuccess(followersCount + 1));
          }
        })
        .catch(error => {
          console.error(`onFollowUnfollow error`, error);
        });
    } else {
      history.push(pathByRouteName('LoginPage', routeConfiguration));
    }
  };

  const onSetFollowsModalOpen = tab => {
    setSelectedFollowsTab(tab);
  };

  const redirectToProfileSettingsPage = () => {
    history.push(pathByRouteName('ProfileSettingsPage', routeConfiguration));
  };

  return (
    <>
      <div className={css.rowUnsetMarginLR}>
        <div className={css.colAvatar}>
          <div className={css.row}>
            <div className={css.avatarContainer}>
              <AvatarLarge className={css.avatarMobile} user={user} disableProfileLink={true} />
            </div>
          </div>
        </div>
        <div className={css.colUserContentSide}>
          <div className={css.userContentSide}>
            <div className={css.row}>
              <div className={css.colDisplayName}>
                <H3 as="h1" className={css.desktopHeading1}>
                  <FormattedMessage
                    id="ProfilePage.desktopHeading1"
                    values={{ name: displayName }}
                  />
                </H3>
              </div>
              <div className={css.colMenuDesktop}>
                {!isCurrentUser && !profileBlocked && (
                  <div
                    className={css.profileMoreMenuIcon}
                    onClick={() => setShowProfileMoreMenu(true)}
                  >
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                  </div>
                )}
              </div>
              <div className={css.colMenuMobile} onClick={() => setShowProfileMoreMenu(true)}>
                {!isCurrentUser && !profileBlocked && (
                  <div className={css.profileMoreMenuIcon}>
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                  </div>
                )}
              </div>
            </div>

            <div className={css.row}>
              {!profileBlocked && (
                <>
                  <div
                    className={css.colFollowers}
                    onClick={() => onSetFollowsModalOpen(FollowsEnum.FollowersTab)}
                  >
                    <div className={css.followsColumns}>
                      <span className={css.value}>{followersCount}</span>{' '}
                      <span className={css.title}>
                        <FormattedMessage id="ProfilePage.followers.title" />
                      </span>
                    </div>
                  </div>
                  <div
                    className={css.colFollowing}
                    onClick={() => onSetFollowsModalOpen(FollowsEnum.FollowingTab)}
                  >
                    <div className={[css.followsColumns, css.divider].join(' ')}>
                      <span className={css.value}>{followingCount}</span>{' '}
                      <span className={css.title}>
                        <FormattedMessage id="ProfilePage.following.title" />
                      </span>
                    </div>
                  </div>
                </>
              )}
              {profileBlocked ? (
                <div className={css.col12}>
                  <Button className={css.unblockButton} onClick={() => onUnblockUser()}>
                    <FormattedMessage id="ProfilePage.unblock.button.text" />
                  </Button>
                </div>
              ) : (
                <div className={css.colFollowsButton}>
                  {isCurrentUser ? (
                    <Button
                      className={css.editProfileButton}
                      onClick={() => redirectToProfileSettingsPage()}
                    >
                      <FormattedMessage id="ProfilePage.editProfile.button.text" />
                    </Button>
                  ) : (
                    <Button
                      className={isFollowing ? css.followingButton : css.followsButton}
                      onClick={() => onFollowUnfollow()}
                    >
                      {isFollowing ? (
                        <FormattedMessage id="ProfilePage.following.button.text" />
                      ) : (
                        <FormattedMessage id="ProfilePage.follow.button.text" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <Modal
          id="ProfilePage.followsModal"
          isOpen={followsModalOpen}
          onClose={() => setFollowsModalOpen(false)}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <FollowsListTabs
            currentTab={selectedFollowsTab}
            setCurrentTab={setSelectedFollowsTab}
            sharetribeProfileUserId={sharetribeProfileUserId}
            setFollowsModalOpen={setFollowsModalOpen}
          />
        </Modal>
        <Modal
          id="ProfilePage.profileMoreMenu"
          isOpen={showProfileMoreMenu}
          onClose={() => setShowProfileMoreMenu(false)}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <SectionReportBlockUser
            profileUser={profileUser}
            setShowProfileMoreMenu={setShowProfileMoreMenu}
          />
        </Modal>
      </div>
    </>
  );
};

export const AsideContent = props => {
  const { user } = props;
  return (
    <div className={css.asideContent}>
      <div className={css.userDetails}>
        <div className={css.row}>
          <AvatarLarge className={css.avatar} user={user} disableProfileLink />
        </div>
      </div>
    </div>
  );
};

export const ReviewsErrorMaybe = props => {
  const { queryReviewsError } = props;
  return queryReviewsError ? (
    <p className={css.error}>
      <FormattedMessage id="ProfilePage.loadingReviewsFailed" />
    </p>
  ) : null;
};

export const MobileReviews = props => {
  const { reviews, queryReviewsError } = props;
  const reviewsOfProvider = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_PROVIDER);
  const reviewsOfCustomer = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_CUSTOMER);
  return (
    <div className={css.mobileReviews}>
      <H4 as="h2" className={css.mobileReviewsTitle}>
        <FormattedMessage
          id="ProfilePage.reviewsFromMyCustomersTitle"
          values={{ count: reviewsOfProvider.length }}
        />
      </H4>
      <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />
      <Reviews reviews={reviewsOfProvider} />
      <H4 as="h2" className={css.mobileReviewsTitle}>
        <FormattedMessage
          id="ProfilePage.reviewsAsACustomerTitle"
          values={{ count: reviewsOfCustomer.length }}
        />
      </H4>
      <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />
      <Reviews reviews={reviewsOfCustomer} />
    </div>
  );
};

export const DesktopReviews = props => {
  const [showReviewsType, setShowReviewsType] = useState(REVIEW_TYPE_OF_PROVIDER);
  const { reviews, queryReviewsError } = props;
  const reviewsOfProvider = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_PROVIDER);
  const reviewsOfCustomer = reviews.filter(r => r.attributes.type === REVIEW_TYPE_OF_CUSTOMER);
  const isReviewTypeProviderSelected = showReviewsType === REVIEW_TYPE_OF_PROVIDER;
  const isReviewTypeCustomerSelected = showReviewsType === REVIEW_TYPE_OF_CUSTOMER;
  const desktopReviewTabs = [
    {
      text: (
        <Heading as="h3" rootClassName={css.desktopReviewsTitle}>
          <FormattedMessage
            id="ProfilePage.reviewsFromMyCustomersTitle"
            values={{ count: reviewsOfProvider.length }}
          />
        </Heading>
      ),
      selected: isReviewTypeProviderSelected,
      onClick: () => setShowReviewsType(REVIEW_TYPE_OF_PROVIDER),
    },
    {
      text: (
        <Heading as="h3" rootClassName={css.desktopReviewsTitle}>
          <FormattedMessage
            id="ProfilePage.reviewsAsACustomerTitle"
            values={{ count: reviewsOfCustomer.length }}
          />
        </Heading>
      ),
      selected: isReviewTypeCustomerSelected,
      onClick: () => setShowReviewsType(REVIEW_TYPE_OF_CUSTOMER),
    },
  ];

  return (
    <div className={css.desktopReviews}>
      <div className={css.desktopReviewsWrapper}>
        <ButtonTabNavHorizontal className={css.desktopReviewsTabNav} tabs={desktopReviewTabs} />

        <ReviewsErrorMaybe queryReviewsError={queryReviewsError} />

        {isReviewTypeProviderSelected ? (
          <Reviews reviews={reviewsOfProvider} />
        ) : (
          <Reviews reviews={reviewsOfCustomer} />
        )}
      </div>
    </div>
  );
};

export const CustomUserFields = props => {
  const { publicData, metadata, userFieldConfig } = props;

  const shouldPickUserField = fieldConfig => fieldConfig?.showConfig?.displayInProfile !== false;
  const propsForCustomFields =
    pickCustomFieldProps(publicData, metadata, userFieldConfig, 'userType', shouldPickUserField) ||
    [];

  return (
    <>
      <SectionDetailsMaybe {...props} />
      {propsForCustomFields.map(customFieldProps => {
        const { schemaType, ...fieldProps } = customFieldProps;
        return schemaType === SCHEMA_TYPE_MULTI_ENUM ? (
          <SectionMultiEnumMaybe {...fieldProps} />
        ) : schemaType === SCHEMA_TYPE_TEXT ? (
          <SectionTextMaybe {...fieldProps} />
        ) : null;
      })}
    </>
  );
};

export const MainContent = props => {
  const {
    userShowError,
    bio,
    displayName,
    listings,
    queryListingsError,
    reviews,
    queryReviewsError,
    viewport,
    publicData,
    metadata,
    userFieldConfig,
    intl,
    isCurrentUser,
    profileUser,
    user,
  } = props;

  const hasListings = listings.length > 0;
  const isMobileLayout = viewport.width < MAX_MOBILE_SCREEN_WIDTH;
  const hasBio = !!bio;

  const listingsContainerClasses = classNames(css.listingsContainer, {
    [css.withBioMissingAbove]: !hasBio,
  });

  if (userShowError || queryListingsError) {
    return (
      <p className={css.error}>
        <FormattedMessage id="ProfilePage.loadingDataFailed" />
      </p>
    );
  }

  const dispatch = useDispatch();
  const state = useSelector(state => state);

  let profileBlocked = false;
  const isAuthenticated = state?.auth?.isAuthenticated;
  if (isAuthenticated) {
    const currentUser = state?.user?.currentUser;
    if (currentUser && profileUser) {
      const blockedUsersObj = currentUser?.attributes?.profile?.protectedData?.blockedUsers;
      const blockedUsers = blockedUsersObj ? blockedUsersObj : {};
      if (profileUser) {
        profileBlocked = blockedUsers?.[profileUser?.id?.uuid];
      }
    }
  }

  const onUnblockUser = () => {
    unblockUser({ userToUnblockUUID: profileUser.id.uuid })
      .then(() => {
        dispatch(fetchCurrentUser());
      })
      .catch(error => {
        console.error(error);
      });
  };

  const followsSection = (
    <FollowersFollowingSection
      profileUser={profileUser}
      displayName={displayName}
      user={user}
      isCurrentUser={isCurrentUser}
      profileBlocked={profileBlocked}
      onUnblockUser={onUnblockUser}
    />
  );

  return profileBlocked ? (
    <div>
      <div className={css.followsSection}>{followsSection}</div>
      <p>
        <FormattedMessage id="ProfilePage.blockedUser.message" />
      </p>
    </div>
  ) : (
    <div>
      <div className={css.followsSection}>{followsSection}</div>
      {hasBio ? <p className={css.bio}>{bio}</p> : null}
      <CustomUserFields
        publicData={publicData}
        metadata={metadata}
        userFieldConfig={userFieldConfig}
        intl={intl}
        isCurrentUser={isCurrentUser}
        profileUser={profileUser}
      />
      {hasListings ? (
        <div className={listingsContainerClasses}>
          <H4 as="h2" className={css.listingsTitle}>
            <FormattedMessage id="ProfilePage.listingsTitle" values={{ count: listings.length }} />
          </H4>
          <ul className={css.listings}>
            {listings.map(l => (
              <li className={css.listing} key={l.id.uuid}>
                <ListingCard listing={l} showAuthorInfo={false} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {isMobileLayout ? (
        <MobileReviews reviews={reviews} queryReviewsError={queryReviewsError} />
      ) : (
        <DesktopReviews reviews={reviews} queryReviewsError={queryReviewsError} />
      )}
    </div>
  );
};

export const ProfilePageComponent = props => {
  const config = useConfiguration();
  const { scrollingDisabled, currentUser, userShowError, user, intl, ...rest } = props;
  const ensuredCurrentUser = ensureCurrentUser(currentUser);
  const profileUser = ensureUser(user);
  const isCurrentUser =
    ensuredCurrentUser.id && profileUser.id && ensuredCurrentUser.id.uuid === profileUser.id.uuid;
  const { bio, displayName, publicData, metadata } = profileUser?.attributes?.profile || {};
  const { userFields } = config.user;

  const schemaTitleVars = { name: displayName, marketplaceName: config.marketplaceName };
  const schemaTitle = intl.formatMessage({ id: 'ProfilePage.schemaTitle' }, schemaTitleVars);

  const dispatch = useDispatch();
  const refreshData = () => {
    dispatch(loadData({ id: user.id.uuid }, null, config));
  };

  if (userShowError && userShowError.status === 404) {
    return <NotFoundPage />;
  }
  return (
    <Page
      scrollingDisabled={scrollingDisabled}
      title={schemaTitle}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'ProfilePage',
        name: schemaTitle,
      }}
    >
      <LayoutSideNavigation
        mainColumnClassName={css.main}
        sideNavClassName={css.aside}
        topbar={<TopbarContainer />}
        sideNav={
          <AsideContent
            user={user}
            isCurrentUser={isCurrentUser}
            displayName={displayName}
            profileUser={profileUser}
          />
        }
        footer={<FooterContainer />}
      >
        <PullToRefresh refreshData={refreshData}>
          <MainContent
            bio={bio}
            displayName={displayName}
            userShowError={userShowError}
            publicData={publicData}
            metadata={metadata}
            userFieldConfig={userFields}
            intl={intl}
            isCurrentUser={isCurrentUser}
            profileUser={profileUser}
            user={user}
            {...rest}
          />
        </PullToRefresh>
      </LayoutSideNavigation>
      <NativeBottomNavbar />
    </Page>
  );
};

ProfilePageComponent.defaultProps = {
  currentUser: null,
  user: null,
  userShowError: null,
  queryListingsError: null,
  reviews: [],
  queryReviewsError: null,
};

ProfilePageComponent.propTypes = {
  scrollingDisabled: bool.isRequired,
  currentUser: propTypes.currentUser,
  user: propTypes.user,
  userShowError: propTypes.error,
  queryListingsError: propTypes.error,
  listings: arrayOf(propTypes.listing).isRequired,
  reviews: arrayOf(propTypes.review),
  queryReviewsError: propTypes.error,

  // form withViewport
  viewport: shape({
    width: number.isRequired,
    height: number.isRequired,
  }).isRequired,

  // from injectIntl
  intl: intlShape.isRequired,
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    userId,
    userShowError,
    queryListingsError,
    userListingRefs,
    reviews,
    queryReviewsError,
  } = state.ProfilePage;
  const userMatches = getMarketplaceEntities(state, [{ type: 'user', id: userId }]);
  const user = userMatches.length === 1 ? userMatches[0] : null;
  const listings = getMarketplaceEntities(state, userListingRefs);
  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    user,
    userShowError,
    queryListingsError,
    listings,
    reviews,
    queryReviewsError,
  };
};

const ProfilePage = compose(
  connect(mapStateToProps),
  withViewport,
  injectIntl
)(ProfilePageComponent);

export default ProfilePage;
