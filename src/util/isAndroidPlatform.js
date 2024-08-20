import { Capacitor } from '@capacitor/core';

const isAndroidPlatform = Capacitor.getPlatform() === 'android';

export default isAndroidPlatform;
