/**
 * Meting Node.js 测试 QQ 音乐歌单
 */

import Meting from '../src/meting.js';

async function main() {
  // 创建 Meting 实例，使用腾讯音乐平台
  const meting = new Meting('tencent');
  
  // 设置会员 cookie
  const qqCookie = 'ptcz=4f12af52a529937ea8eb5a91aefae084836069fb38dc7919f2241a046bcfc061; yyb_muid=1CC16F0F508968AC102D7A0551A76923; pgv_pvid=8083129450; eas_sid=01q7a5G7O9N4e2c589D630a1e3; RK=aXxq9tJF00; fqm_pvqid=373e3cfe-d59b-44f1-a55d-dc78900afb89; fqm_sessionid=f3a4181e-d29e-4ff4-aae3-dfdddbbc03e1; _qpsvr_localtk=0.5592945411071832; pgv_info=ssid=s7099375940; ts_uid=8443681180; login_type=1; wxrefresh_token=; psrf_qqaccess_token=B91CD6F25B3EFAFA6DF4C098DA86B1D7; tmeLoginType=2; psrf_access_token_expiresAt=1782434330; wxopenid=; psrf_qqunionid=2AB69488DDC9ED4B7C50CBA7F9EE562B; wxunionid=; qm_keyst=Q_H_L_63k3NNsY1cUgrkzi8Xj4Tjjbrvpny_HdDuOD_oPneEeHZGsPip44hkEi_CFQEtT-W_JXAknd98Spdi7U-4TE1CUkb; music_ignore_pskey=202306271436Hn@vBj; uin=527623956; qqmusic_key=Q_H_L_63k3NNsY1cUgrkzi8Xj4Tjjbrvpny_HdDuOD_oPneEeHZGsPip44hkEi_CFQEtT-W_JXAknd98Spdi7U-4TE1CUkb; psrf_qqopenid=C6E6877F367FDBD43C9995081E7A0D1B; euin=7K-l7w-iNK4s; psrf_musickey_createtime=1777250330; psrf_qqrefresh_token=DFF0AF84633851C51E7988640508CD08';
  meting.cookie(qqCookie);
  
  // 开启数据格式化
  meting.format(true);
  
  console.log('=== 测试 QQ 音乐歌单 ===\n');
  
  const playlistId = '2633897174';
  console.log(`歌单 ID: ${playlistId}\n`);
  
  try {
    // 获取歌单内容
    console.log('1. 获取歌单内容：');
    const playlistResult = await meting.playlist(playlistId);
    console.log('歌单数据：');
    console.log(JSON.stringify(JSON.parse(playlistResult), null, 2));
    console.log('\n');
    
    const songs = JSON.parse(playlistResult);
    if (songs.length > 0) {
      console.log(`✅ 成功获取歌单，共 ${songs.length} 首歌曲\n`);
      
      // 显示前几首歌
      console.log('前 3 首歌曲：');
      songs.slice(0, 3).forEach((song, index) => {
        console.log(`${index + 1}. ${song.name} - ${song.artist.join(', ')}`);
      });
      console.log('\n');
      
      // 测试获取第一首歌的播放链接
      if (songs[0]) {
        const firstSong = songs[0];
        console.log(`2. 测试获取第一首歌的播放链接：`);
        console.log(`歌曲: ${firstSong.name} - ${firstSong.artist.join(', ')}`);
        try {
          const url = await meting.url(firstSong.url_id, 320);
          console.log('播放链接：');
          console.log(JSON.stringify(JSON.parse(url), null, 2));
        } catch (err) {
          console.log('获取播放链接失败:', err.message);
        }
      }
    } else {
      console.log('❌ 歌单为空或获取失败');
    }
    
  } catch (error) {
    console.error('发生错误：', error);
  }
}

// 运行示例
main().then(() => {
  console.log('\n测试完成！');
}).catch(error => {
  console.error('测试失败：', error);
});