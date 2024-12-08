import React, { useEffect, useState } from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect, useSelector } from 'react-redux';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';

import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';
import isNativePlatform from '../../util/isNativePlatform';
import { PushNotifications } from '@capacitor/push-notifications';
import PushNotificationService from '../../services/push-notifications.service';
import { Toast } from '@capacitor/toast';
import { updateFCMToken } from '../../util/api';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error } = props;

  const [notifications, setNotifications] = useState([]);

  const state = useSelector(state => state);
  const currentUser = state.user?.currentUser;

  useEffect(() => {
    if (currentUser?.id) {
      initPushNotifications();
    }
  }, [currentUser]);

  const onUpdateFCMToken = fcmToken => {
    updateFCMToken({ fcmToken, userUUID: currentUser.id.uuid })
      .then(res => {
        console.log(res);
      })
      .catch(err => {
        console.error(err);
      });
  };

  const initPushNotifications = () => {
    if (isNativePlatform) {
      PushNotifications.checkPermissions().then(res => {
        if (res?.receive !== 'granted') {
          PushNotifications.requestPermissions().then(res => {
            if (res?.receive === 'denied') {
              // showToast('Push Notification permission denied');
            } else {
              // showToast('Push Notification permission granted');
              PushNotificationService.registerPushNotifications(
                setNotifications,
                showToast,
                onUpdateFCMToken
              );
            }
          });
        } else {
          PushNotificationService.registerPushNotifications(
            setNotifications,
            showToast,
            onUpdateFCMToken
          );
        }
      });
    }
  };

  const showToast = async msg => {
    await Toast.show({
      text: msg,
    });
  };

  return (
    <PageBuilder
      assetName={ASSET_NAME}
      pageAssetsData={pageAssetsData?.[camelize(ASSET_NAME)]?.data}
      inProgress={inProgress}
      error={error}
      fallbackPage={<FallbackPage error={error} />}
      hideMobileBackButton={true}
    />
  );
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  return { pageAssetsData, inProgress, error };
};

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(connect(mapStateToProps))(LandingPageComponent);

export default LandingPage;
