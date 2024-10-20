import { useEffect, useState } from 'react';
import css from './FollowsListTabs.module.scss';
import Button from '../Button/Button';
import { getFollowersList, getFollowingList } from '../../util/api';
import Avatar from '../Avatar/Avatar';
import { FollowsEnum } from '../../enums/follows.enum';
import { FormattedMessage } from 'react-intl';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { pathByRouteName } from '../../util/routes';

const FollowsItem = props => {
  const { item, currentTab, setFollowsModalOpen } = props;

  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();

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
          {item.following ? (
            <Button className={css.followsButton}>
              <FormattedMessage id="FollowsListTabs.unfollow.button" />
            </Button>
          ) : (
            <Button className={css.followsButton}>
              <FormattedMessage id="FollowsListTabs.follow.button" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const FollowsListTabs = props => {
  const {
    currentTab,
    setCurrentTab,
    sharetribeProfileUserId,
    followersCount,
    followingCount,
    setFollowsModalOpen,
  } = props;

  if (!currentTab) {
    return null;
  }
  if (!sharetribeProfileUserId) {
    return null;
  }

  const [followersList, setFollowersList] = useState(new Array());
  const [followingList, setFollowingList] = useState(new Array());

  //   const [followersCount, setFollowersCount] = useState(0);
  //   const [followingCount, setFollowingCount] = useState(0);

  const tabClassActive = [css.tab, css.active].join(' ');

  useEffect(() => {
    if (currentTab && sharetribeProfileUserId) {
      if (currentTab === FollowsEnum.FollowersTab) {
        getFollowersList({ sharetribeProfileUserId, limit: 10, offset: 0 })
          .then(res => {
            setFollowersList(res.data);
            //   setFollowersCount(res.count);
          })
          .catch(error => {
            console.error(error);
          });
      } else if (currentTab === FollowsEnum.FollowingTab) {
        getFollowingList({ sharetribeProfileUserId, limit: 10, offset: 0 })
          .then(res => {
            setFollowingList(res.data);
            //   setFollowersCount(res.count);
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

  return (
    currentTab && (
      <>
        <div className={css.row}>
          <div className={css.col6}>
            {' '}
            <div
              className={currentTab === FollowsEnum.FollowersTab ? tabClassActive : css.tab}
              onClick={() => setCurrentTab(FollowsEnum.FollowersTab)}
            >
              {followersCount} Followers
            </div>
          </div>
          <div className={css.col6}>
            {' '}
            <div
              className={currentTab === FollowsEnum.FollowingTab ? tabClassActive : css.tab}
              onClick={() => setCurrentTab(FollowsEnum.FollowingTab)}
            >
              {followingCount} Following
            </div>
          </div>
        </div>
        <div className={css.row}>
          <div className={css.col12}>
            {currentTab === FollowsEnum.FollowersTab && (
              <>
                {followersList && followersList.length > 0
                  ? followersList.map(item => (
                      <FollowsItem
                        item={item}
                        currentTab={currentTab}
                        setFollowsModalOpen={setFollowsModalOpen}
                      />
                    ))
                  : zeroFollowsResultsElem}
              </>
            )}
            {currentTab === FollowsEnum.FollowingTab && (
              <>
                {followingList && followingList.length > 0
                  ? followingList.map(item => (
                      <FollowsItem
                        item={item}
                        currentTab={currentTab}
                        setFollowsModalOpen={setFollowsModalOpen}
                      />
                    ))
                  : zeroFollowsResultsElem}
              </>
            )}
          </div>
        </div>
      </>
    )
  );
};

export default FollowsListTabs;
