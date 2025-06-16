import React, { useEffect, useState } from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';

import FallbackPage from './FallbackPage';
import { ASSET_NAME, loadData } from './LandingPage.duck';
import isNativePlatform from '../../util/isNativePlatform';
import { PushNotifications } from '@capacitor/push-notifications';
import PushNotificationService from '../../services/push-notifications.service';
import { Toast } from '@capacitor/toast';
import { updateFCMToken } from '../../util/api';
import isIOSPlatform from '../../util/isIOSPlatform';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error } = props;

  const [notifications, setNotifications] = useState([]);

  const state = useSelector(state => state);
  const currentUser = state.user?.currentUser;
  const history = useHistory();

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

  const handleNotificationTap = (transactionId) => {
    console.log('Handling notification tap for transaction:', transactionId);
    
    // Check if user is authenticated
    if (!currentUser?.id) {
      console.log('User not authenticated, redirecting to login');
      history.push('/login');
      return;
    }

    // Navigate to transaction page
    // We'll try both order and sale routes since the TransactionPage component 
    // will handle the proper redirects based on user ownership
    // Start with order page - if user doesn't own it, the page will redirect to the correct route
    try {
      history.push(`/order/${transactionId}`);
      console.log(`Navigated to /order/${transactionId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to inbox
      history.push('/inbox');
    }
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
                onUpdateFCMToken,
                handleNotificationTap
              );
            }
          });
        } else {
          PushNotificationService.registerPushNotifications(
            setNotifications,
            showToast,
            onUpdateFCMToken,
            handleNotificationTap
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

  const dispatch = useDispatch();
  const refreshData = () => {
    dispatch(loadData());
  };

  return (
    <PageBuilder
      assetName={ASSET_NAME}
      pageAssetsData={pageAssetsData?.[camelize(ASSET_NAME)]?.data}
      inProgress={inProgress}
      error={error}
      fallbackPage={<FallbackPage error={error} />}
      // hideMobileBackButton={true} //hide this for menu to work on web
      // hideMobileBackButton={process.env.REACT_CAPACITOR_ENV == 'web'}
      hideMobileBackButton={isIOSPlatform}
      refreshData={refreshData}
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
