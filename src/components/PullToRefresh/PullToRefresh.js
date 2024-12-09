// import {
//   IonContent,
//   IonHeader,
//   IonRefresher,
//   IonRefresherContent,
//   IonTitle,
//   IonToolbar,
//   RefresherEventDetail,
// } from '@ionic/react';
import { IconSpinner } from '..';
import css from './PullToRefresh.module.scss';
import isNativePlatform from '../../util/isNativePlatform';
import React, { useState } from 'react';
import SimplePullToRefresh from 'react-simple-pull-to-refresh';

const PullToRefresh = props => {
  const { rootClassName, children, scrollY = false, refreshData, excludePullToRefresh } = props;

  if (!isNativePlatform) {
    return children;
  }

  if (excludePullToRefresh) {
    return children;
  }

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = event => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => {
      // if (event) event.detail.complete();
      setRefreshing(false);
    }, 1500);
  };

  // const rootClasses = rootClassName ? rootClassName : css.ionContentContainer;

  const iconSpinnerElement = (
    <div className={css.iconSpinnerContainer}>
      <IconSpinner className={css.iconSpinner} />
    </div>
  );

  return (
    // <IonContent
    //   // className={`${css.ionContentContainer} ion-padding`}
    //   className={`${rootClasses} ion-padding`}
    //   scrollY={scrollY}
    //   // fullscreen={true}
    // >
    //   <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
    //     {refreshing && (
    //       <IonRefresherContent
    //         pullingIcon={
    //           <div className={css.center}>
    //             <IconSpinner className={css.iconSpinner} />
    //           </div>
    //         }
    //       ></IonRefresherContent>
    //     )}
    //   </IonRefresher>
    //   {children}
    // </IonContent>
    // <ReactPullToRefresh
    //   onRefresh={handleRefresh}
    //   className="your-own-class-if-you-want"
    //   style={{ textAlign: 'center' }}
    // >
    //   <div className={css.center}>
    //     <IconSpinner className={css.iconSpinner} />
    //   </div>
    // </ReactPullToRefresh>
    <SimplePullToRefresh
      onRefresh={async event => handleRefresh(event)}
      refreshingContent={iconSpinnerElement}
      pullingContent={iconSpinnerElement}
      resistance={1.5}
    >
      {children}
    </SimplePullToRefresh>
  );
};

export default PullToRefresh;
