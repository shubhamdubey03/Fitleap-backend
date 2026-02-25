const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

exports.generateToken = (channel) => {
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expire = Math.floor(Date.now() / 1000) + 3600;

    return RtcTokenBuilder.buildTokenWithUid(
        process.env.AGORA_APP_ID,
        process.env.AGORA_APP_CERTIFICATE,
        channel,
        uid,
        role,
        expire
    );
};