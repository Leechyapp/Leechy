import { useEffect, useState } from 'react';
import css from './FollowsListTabs.module.scss';
import Button from '../Button/Button';
import { getFollowersList, getFollowingList } from '../../util/api';
import Avatar from '../Avatar/Avatar';
import { FollowsEnum } from '../../enums/follows.enum';

const FollowsListTabs = props => {
  const { sharetribeProfileUserId, followersCount, followingCount } = props;

  const [currentTab, setCurrentTab] = useState(FollowsEnum.FollowersTab);

  const [followersList, setFollowersList] = useState(new Array());
  const [followingList, setFollowingList] = useState(new Array());

  //   const [followersCount, setFollowersCount] = useState(0);
  //   const [followingCount, setFollowingCount] = useState(0);

  const tabClassActive = [css.tab, css.active].join(' ');

  useEffect(() => {
    if (sharetribeProfileUserId) {
      if (currentTab === FollowsEnum.FollowersTab) {
        getFollowersList({ sharetribeProfileUserId, limit: 10, offset: 0 })
          .then(res => {
            setFollowersList(res.data);
            //   setFollowersCount(res.count);
          })
          .catch(error => {
            console.error(error);
          });
      } else {
        getFollowingList({ sharetribeProfileUserId, limit: 10, offset: 0 })
          .then(res => {
            setFollowersList(res.data);
            //   setFollowersCount(res.count);
          })
          .catch(error => {
            console.error(error);
          });
      }
    }
  }, [sharetribeProfileUserId]);

  const zeroFollowsResultsElem = (
    <div className={css.rowUnsetMarginLR}>
      <div className={css.col12}>
        <p>0 results</p>
      </div>
    </div>
  );

  return (
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
                    <div key={item.id} className={css.followsListItem}>
                      <div className={css.rowUnsetMarginLR}>
                        <div className={css.col2}>
                          <Avatar user={item.user} />
                        </div>
                        <div className={css.col4}>
                          <p className={css.displayName}>
                            {item.user.attributes.profile.displayName}
                          </p>
                        </div>
                        <div className={css.col6}>
                          <Button className={css.followsButton}>Unfollow</Button>
                        </div>
                      </div>
                    </div>
                  ))
                : zeroFollowsResultsElem}
            </>
          )}
          {currentTab === FollowsEnum.FollowingTab && (
            <>
              {followingList && followingList.length > 0
                ? followingList.map(item => (
                    <div key={item.id} className={css.followsListItem}>
                      <div className={css.rowUnsetMarginLR}>
                        <div className={css.col2}>
                          <Avatar user={item.user} />
                        </div>
                        <div className={css.col4}>
                          <p className={css.displayName}>
                            {item.user.attributes.profile.displayName}
                          </p>
                        </div>
                        <div className={css.col6}>
                          <Button className={css.followsButton}>Unfollow</Button>
                        </div>
                      </div>
                    </div>
                  ))
                : zeroFollowsResultsElem}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default FollowsListTabs;
