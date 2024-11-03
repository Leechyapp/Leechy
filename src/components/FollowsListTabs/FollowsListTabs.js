import { useEffect, useState } from 'react';
import css from './FollowsListTabs.module.scss';
import Button from '../Button/Button';
import { followUnfollowUser, getFollowersList, getFollowingList } from '../../util/api';
import Avatar from '../Avatar/Avatar';
import { FollowsEnum } from '../../enums/follows.enum';
import { FormattedMessage } from 'react-intl';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { pathByRouteName } from '../../util/routes';
import { fetchInitialFollowsData } from '../../containers/ProfilePage/ProfilePage.duck';
import { useDispatch, useSelector } from 'react-redux';

const FollowsItem = props => {
  const { item, setFollowsModalOpen, index, updateFollowsItem } = props;

  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();

  const state = useSelector(state => state);
  const { currentUser } = state.user;
  const { isAuthenticated } = state.auth;
  const currentUserId = currentUser?.id?.uuid;

  const onFollowUnfollow = sharetribeProfileUserId => {
    if (isAuthenticated) {
      followUnfollowUser({ sharetribeProfileUserId })
        .then(res => {
          if (res?.code === FollowsEnum.Unfollowed) {
            item.following = false;
            updateFollowsItem(item, index);
          } else if (res?.code === FollowsEnum.Followed) {
            item.following = true;
            updateFollowsItem(item, index);
          }
        })
        .catch(error => {
          console.error(`onFollowUnfollow error`, error);
        });
    } else {
      history.push(pathByRouteName('LoginPage', routeConfiguration));
    }
  };

  const redirectToProfileSettingsPage = () => {
    setFollowsModalOpen(false);
    history.push(
      pathByRouteName('ProfilePage', routeConfiguration, {
        id: item.user.id.uuid,
      })
    );
  };

  return (
    <div key={item.id} className={css.followsListItem}>
      <div className={css.rowUnsetMarginLR}>
        <div className={css.col2} onClick={() => redirectToProfileSettingsPage()}>
          <Avatar user={item.user} disableProfileLink={true} />
        </div>
        <div className={css.col4} onClick={() => redirectToProfileSettingsPage()}>
          <p className={css.displayName}>{item?.user?.attributes?.profile?.displayName}</p>
        </div>
        <div className={css.col6}>
          {isAuthenticated ? (
            currentUserId === item.user.id.uuid ? (
              <></>
            ) : (
              <>
                {item.following ? (
                  <Button
                    className={css.unfollowButton}
                    onClick={() => onFollowUnfollow(item.user.id)}
                  >
                    <FormattedMessage id="FollowsListTabs.unfollow.button" />
                  </Button>
                ) : (
                  <Button
                    className={css.followsButton}
                    onClick={() => onFollowUnfollow(item.user.id)}
                  >
                    <FormattedMessage id="FollowsListTabs.follow.button" />
                  </Button>
                )}
              </>
            )
          ) : (
            <Button className={css.followsButton} onClick={() => onFollowUnfollow()}>
              <FormattedMessage id="FollowsListTabs.follow.button" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const FollowsListTabs = props => {
  const { currentTab, setCurrentTab, sharetribeProfileUserId, setFollowsModalOpen } = props;

  if (!currentTab) {
    return null;
  }
  if (!sharetribeProfileUserId) {
    return null;
  }

  const dispatch = useDispatch();

  const [followersList, setFollowersList] = useState(new Array());
  const [followingList, setFollowingList] = useState(new Array());

  const state = useSelector(state => state.ProfilePage);
  const { followersCount, followingCount } = state;

  const tabClassActive = [css.tab, css.active].join(' ');

  useEffect(() => {
    if (currentTab && sharetribeProfileUserId) {
      if (currentTab === FollowsEnum.FollowersTab) {
        getFollowersList({ sharetribeProfileUserId, limit: 10, offset: 0 })
          .then(res => {
            setFollowersList(res.data);
          })
          .catch(error => {
            console.error(error);
          });
      } else if (currentTab === FollowsEnum.FollowingTab) {
        getFollowingList({ sharetribeProfileUserId, limit: 10, offset: 0 })
          .then(res => {
            setFollowingList(res.data);
          })
          .catch(error => {
            console.error(error);
          });
      }
    }
  }, [currentTab, sharetribeProfileUserId]);

  const zeroFollowsResultsElem = (
    <div className={css.rowUnsetMarginLR}>
      <div className={css.col12}>
        <p>
          <FormattedMessage id="FollowsListTabs.noResults" />
        </p>
      </div>
    </div>
  );

  const getFollowsItem = (currentTab, item, index) => {
    const updateFollowsItem = (item, index) => {
      if (FollowsEnum.FollowersTab) {
        const updatedFollowsList = [...followersList];
        updatedFollowsList[index] = item;
        setFollowersList(updatedFollowsList);
        dispatch(fetchInitialFollowsData(sharetribeProfileUserId));
      } else {
        const updatedFollowsList = [...followingList];
        updatedFollowsList[index] = item;
        setFollowersList(updatedFollowsList);
        dispatch(fetchInitialFollowsData(sharetribeProfileUserId));
      }
    };

    return (
      <FollowsItem
        item={item}
        currentTab={currentTab}
        setFollowsModalOpen={setFollowsModalOpen}
        index={index}
        updateFollowsItem={updateFollowsItem}
      />
    );
  };

  return (
    currentTab && (
      <div className={css.container}>
        <div className={css.row}>
          <div className={css.col6}>
            {' '}
            <div
              className={currentTab === FollowsEnum.FollowersTab ? tabClassActive : css.tab}
              onClick={() => setCurrentTab(FollowsEnum.FollowersTab)}
            >
              <FormattedMessage id="FollowsListTabs.followers.count" values={{ followersCount }} />
            </div>
          </div>
          <div className={css.col6}>
            {' '}
            <div
              className={currentTab === FollowsEnum.FollowingTab ? tabClassActive : css.tab}
              onClick={() => setCurrentTab(FollowsEnum.FollowingTab)}
            >
              <FormattedMessage id="FollowsListTabs.following.count" values={{ followingCount }} />
            </div>
          </div>
        </div>
        <div className={css.row}>
          <div className={css.col12}>
            {currentTab === FollowsEnum.FollowersTab && (
              <>
                {followersList && followersList.length > 0
                  ? followersList.map((item, index) => getFollowsItem(currentTab, item, index))
                  : zeroFollowsResultsElem}
              </>
            )}
            {currentTab === FollowsEnum.FollowingTab && (
              <>
                {followingList && followingList.length > 0
                  ? followingList.map((item, index) => getFollowsItem(currentTab, item, index))
                  : zeroFollowsResultsElem}
              </>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default FollowsListTabs;
