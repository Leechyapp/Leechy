import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';
import { types as sdkTypes, createImageVariantConfig } from '../../util/sdkLoader';
import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { searchInitialFollowsData } from '../../util/api';

const { UUID } = sdkTypes;

// ================ Action types ================ //

export const SET_INITIAL_STATE = 'app/ProfilePage/SET_INITIAL_STATE';

export const SHOW_USER_REQUEST = 'app/ProfilePage/SHOW_USER_REQUEST';
export const SHOW_USER_SUCCESS = 'app/ProfilePage/SHOW_USER_SUCCESS';
export const SHOW_USER_ERROR = 'app/ProfilePage/SHOW_USER_ERROR';

export const QUERY_LISTINGS_REQUEST = 'app/ProfilePage/QUERY_LISTINGS_REQUEST';
export const QUERY_LISTINGS_SUCCESS = 'app/ProfilePage/QUERY_LISTINGS_SUCCESS';
export const QUERY_LISTINGS_ERROR = 'app/ProfilePage/QUERY_LISTINGS_ERROR';

export const QUERY_REVIEWS_REQUEST = 'app/ProfilePage/QUERY_REVIEWS_REQUEST';
export const QUERY_REVIEWS_SUCCESS = 'app/ProfilePage/QUERY_REVIEWS_SUCCESS';
export const QUERY_REVIEWS_ERROR = 'app/ProfilePage/QUERY_REVIEWS_ERROR';

export const FETCH_FOLLOWERS_COUNT_SUCCESS = 'app/ProfilePage/FETCH_FOLLOWERS_COUNT_SUCCESS';
export const FETCH_FOLLOWING_COUNT_SUCCESS = 'app/ProfilePage/FETCH_FOLLOWING_COUNT_SUCCESS';
export const FETCH_IS_FOLLOWING_SUCCESS = 'app/ProfilePage/FETCH_IS_FOLLOWING_SUCCESS';

// ================ Reducer ================ //

const initialState = {
  userId: null,
  userListingRefs: [],
  userShowError: null,
  queryListingsError: null,
  reviews: [],
  queryReviewsError: null,
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
};

export default function profilePageReducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case SET_INITIAL_STATE:
      return { ...initialState };
    case SHOW_USER_REQUEST:
      return { ...state, userShowError: null, userId: payload.userId };
    case SHOW_USER_SUCCESS:
      return state;
    case SHOW_USER_ERROR:
      return { ...state, userShowError: payload };

    case QUERY_LISTINGS_REQUEST:
      return {
        ...state,

        // Empty listings only when user id changes
        userListingRefs: payload.userId === state.userId ? state.userListingRefs : [],

        queryListingsError: null,
      };
    case QUERY_LISTINGS_SUCCESS:
      return { ...state, userListingRefs: payload.listingRefs };
    case QUERY_LISTINGS_ERROR:
      return { ...state, userListingRefs: [], queryListingsError: payload };
    case QUERY_REVIEWS_REQUEST:
      return { ...state, queryReviewsError: null };
    case QUERY_REVIEWS_SUCCESS:
      return { ...state, reviews: payload };
    case QUERY_REVIEWS_ERROR:
      return { ...state, reviews: [], queryReviewsError: payload };

    case FETCH_FOLLOWERS_COUNT_SUCCESS:
      return { ...state, followersCount: payload.followersCount };
    case FETCH_FOLLOWING_COUNT_SUCCESS:
      return { ...state, followingCount: payload.followingCount };
    case FETCH_IS_FOLLOWING_SUCCESS:
      return { ...state, isFollowing: payload.isFollowing };

    default:
      return state;
  }
}

// ================ Action creators ================ //

export const setInitialState = () => ({
  type: SET_INITIAL_STATE,
});

export const showUserRequest = userId => ({
  type: SHOW_USER_REQUEST,
  payload: { userId },
});

export const showUserSuccess = () => ({
  type: SHOW_USER_SUCCESS,
});

export const showUserError = e => ({
  type: SHOW_USER_ERROR,
  error: true,
  payload: e,
});

export const queryListingsRequest = userId => ({
  type: QUERY_LISTINGS_REQUEST,
  payload: { userId },
});

export const queryListingsSuccess = listingRefs => ({
  type: QUERY_LISTINGS_SUCCESS,
  payload: { listingRefs },
});

export const queryListingsError = e => ({
  type: QUERY_LISTINGS_ERROR,
  error: true,
  payload: e,
});

export const queryReviewsRequest = () => ({
  type: QUERY_REVIEWS_REQUEST,
});

export const queryReviewsSuccess = reviews => ({
  type: QUERY_REVIEWS_SUCCESS,
  payload: reviews,
});

export const queryReviewsError = e => ({
  type: QUERY_REVIEWS_ERROR,
  error: true,
  payload: e,
});

export const fetchFollowersCountSuccess = followersCount => ({
  type: FETCH_FOLLOWERS_COUNT_SUCCESS,
  payload: { followersCount },
});
export const fetchFollowingCountSuccess = followingCount => ({
  type: FETCH_FOLLOWING_COUNT_SUCCESS,
  payload: { followingCount },
});
export const fetchIsFollowingSuccess = isFollowing => ({
  type: FETCH_IS_FOLLOWING_SUCCESS,
  payload: { isFollowing },
});

// ================ Thunks ================ //

export const queryUserListings = (userId, config) => (dispatch, getState, sdk) => {
  dispatch(queryListingsRequest(userId));

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  return sdk.listings
    .query({
      author_id: userId,
      include: ['author', 'images'],
      'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
    })
    .then(response => {
      // Pick only the id and type properties from the response listings
      const listingRefs = response.data.data.map(({ id, type }) => ({ id, type }));
      dispatch(addMarketplaceEntities(response));
      dispatch(queryListingsSuccess(listingRefs));
      return response;
    })
    .catch(e => dispatch(queryListingsError(storableError(e))));
};

export const queryUserReviews = userId => (dispatch, getState, sdk) => {
  sdk.reviews
    .query({
      subject_id: userId,
      state: 'public',
      include: ['author', 'author.profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    })
    .then(response => {
      const reviews = denormalisedResponseEntities(response);
      dispatch(queryReviewsSuccess(reviews));
    })
    .catch(e => dispatch(queryReviewsError(e)));
};

export const showUser = (userId, config) => (dispatch, getState, sdk) => {
  dispatch(showUserRequest(userId));
  return sdk.users
    .show({
      id: userId,
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    })
    .then(response => {
      const userFields = config?.user?.userFields;
      const sanitizeConfig = { userFields };
      dispatch(addMarketplaceEntities(response, sanitizeConfig));
      dispatch(showUserSuccess());
      return response;
    })
    .catch(e => dispatch(showUserError(storableError(e))));
};

export const fetchUserFollowsCount = (userId, config) => (dispatch, getState, sdk) => {
  return searchInitialFollowsData({
    sharetribeProfileUserId: userId,
  })
    .then(response => {
      if (response?.followersCount) {
        dispatch(fetchFollowersCountSuccess(response.followersCount));
      }
      if (response?.followingCount) {
        dispatch(fetchFollowingCountSuccess(response.followingCount));
      }
      if (response?.isFollowing) {
        dispatch(fetchIsFollowingSuccess(response.isFollowing));
      }
      return response;
    })
    .catch(e => {
      // dispatch(showUserError(storableError(e)))
    });
};

export const loadData = (params, search, config) => (dispatch, getState, sdk) => {
  const userId = new UUID(params.id);

  // Clear state so that previously loaded data is not visible
  // in case this page load fails.
  dispatch(setInitialState());

  return Promise.all([
    dispatch(fetchCurrentUser()),
    dispatch(showUser(userId, config)),
    dispatch(fetchUserFollowsCount(userId, config)),
    dispatch(queryUserListings(userId, config)),
    dispatch(queryUserReviews(userId)),
  ]);
};
