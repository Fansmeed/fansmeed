import { format, formatDistanceToNow } from 'date-fns';

// Function to get IP address
export async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to get IP address:', error);
        return 'Unknown';
    }
}

// Function to get all geolocation data in one API call
export async function getGeolocationData(ip) {
    if (ip === 'Unknown') {
        return {
            location: 'Unknown',
            timezone: 'Unknown'
        };
    }
    
    const API_KEY = 'bb712f60cae5488884e9c4cb6e6f58b7';
    
    try {
        const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${API_KEY}&ip=${ip}`);
        const data = await response.json();
        
        // Get location using country_capital and country_name
        const location = data.country_capital && data.country_name 
            ? `${data.country_capital}, ${data.country_name}`
            : data.country_name || 'Unknown location';
            
        // Get timezone
        const timezone = data.time_zone?.name || 'Unknown';
        
        return {
            location: location,
            timezone: timezone
        };
        
    } catch (error) {
        console.error('Failed to get geolocation data:', error);
        return {
            location: 'Location unavailable',
            timezone: 'Unknown'
        };
    }
}

// Function to get browser info
export function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    
    return browser;
}

// Function to get OS info
export function getOSInfo() {
    const userAgent = navigator.userAgent;
    let os = 'Unknown';
    
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'Mac OS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    return os;
}

// Function to get device type
export function getDeviceType() {
    const userAgent = navigator.userAgent;
    
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        return /Tablet|iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
}

// Function to get platform
export function getPlatform() {
    return navigator.platform || 'Unknown';
}

// Main function to collect all device info
export async function collectDeviceInfo() {
    try {
        const ip = await getIPAddress();
        const geolocationData = await getGeolocationData(ip);
        
        return {
            ipAddress: ip,
            location: geolocationData.location,
            browser: getBrowserInfo(),
            os: getOSInfo(),
            deviceType: getDeviceType(),
            platform: getPlatform(),
            timezone: geolocationData.timezone,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language || 'Unknown'
        };
    } catch (error) {
        console.error('Failed to collect device info:', error);
        return {
            ipAddress: 'Unknown',
            location: 'Unknown',
            browser: getBrowserInfo(),
            os: getOSInfo(),
            deviceType: getDeviceType(),
            platform: getPlatform(),
            timezone: 'Unknown',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            screenResolution: 'Unknown',
            language: navigator.language || 'Unknown'
        };
    }
}

// Format device info for display
export function formatDeviceInfoForDisplay(deviceInfo) {
    return {
        device: `${deviceInfo.deviceType} (${deviceInfo.os})`,
        browser: deviceInfo.browser,
        location: deviceInfo.location,
        ip: deviceInfo.ipAddress,
        time: format(new Date(deviceInfo.timestamp), 'PPpp'),
        timeAgo: formatDistanceToNow(new Date(deviceInfo.timestamp), { addSuffix: true })
    };
}