import { Capacitor } from '@capacitor/core';

const isIOSPlatform = Capacitor.getPlatform() === 'ios';

export default isIOSPlatform;
