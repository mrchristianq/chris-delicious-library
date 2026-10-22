import test from 'node:test';
import assert from 'node:assert/strict';
import { originalParsers } from './v13-parsers.mjs';
import { projectLegacyRow } from '../../app/lib/v14/legacy-row.ts';
import { automaticArtworkSources, syncDatabaseArtwork } from '../../app/lib/v14/sync-artwork.ts';
const parsers=originalParsers();
const library='11111111-1111-4111-8111-111111111111';
const base={id:'22222222-2222-4222-8222-222222222222',revision:1,title:'Fixture',personal_rating:0,completed_on:'2026-10-01',notes:'One\n\nTwo',user_fields:{},metadata:{}};
for(const media_type of ['book','movie','tv','game'])test(`actual unchanged v13 ${media_type} parser preserves rendering fields`,()=>{
 const canonical={...base,media_type,user_status:media_type==='movie'?'Watched':'Completed'};
 const metadata={Title:'Fixture',Notes:base.notes,'My Rating':'0',MyRating:'0','Completed Date':base.completed_on,WatchDate:base.completed_on,
   R2CoverUrl:'https://example.com/r2.jpg',R2BackdropUrl:'https://example.com/backdrop.jpg',PosterURL:'https://example.com/poster.jpg',CoverURL:'https://example.com/game.jpg',ImageURL:'https://example.com/book.jpg',
   Author:'Author',Director:'Director',Developer:'Developer',TMDB_ID:'123',IGDB_ID:'456',ISBN:'1234567890',Types:'Audiobook',Platform:'Steam',Ownership:'Collection',Format:'Digital',
   WishlistOrder:'3',QueuedOrder:'2',Genre:'Fantasy',Genres:'Fantasy',Tags:'Favorite',Runtime:'120','Hours Played':'12','Year Played':'2026',Status:media_type==='movie'?'Released':media_type==='tv'?'Returning Series':'Completed'};
 // Book Sheet completion cells are formatted as local calendar dates; the
 // unchanged full-details formatter must not receive an ISO UTC instant.
 if(media_type==='book')metadata['Completed Date']='10/1/2026';
 if(media_type==='movie'||media_type==='tv'){metadata.WatchStatus=canonical.user_status;metadata['Watch Status']=canonical.user_status;metadata.Watched='true';}
 if(media_type==='game'){metadata.PlayStatus='Completed';metadata.Completed='true';}
 const expected=parsers[media_type](metadata);
 const projection=projectLegacyRow({...canonical,metadata},library);
 assert.deepEqual(parsers[media_type](projection.row),expected);
});

test('actual v13 game parser fallback is display-only for an image-free v14 manual add',async()=>{
 const canonical={...base,media_type:'game',title:'Manual Entry Without Art',user_status:'Wishlist',
  user_fields:{Platform:'Wishlist',Ownership:'Wishlist',Format:'Digital'},metadata:{}};
 const projected=projectLegacyRow(canonical,library);
 const game=parsers.game(projected.row);
 assert.ok(game.posterUrlFallback.startsWith('/covers/games/'));
 assert.equal(game.posterUrl,game.posterUrlFallback);
 assert.equal(game.coverUrl,undefined);
 assert.equal(game.r2CoverUrl,undefined);
 const sources=automaticArtworkSources(game,{cover:game.posterUrl,backdrop:''});
 await syncDatabaseArtwork({artwork:async()=>assert.fail('Manual add tried uploading invented parser artwork')},game,sources,row=>row);
 assert.deepEqual(sources,{cover:'',backdrop:''});
 assert.equal(game.status,'Wishlist');assert.equal(game.platform,'Wishlist');assert.equal(game.format,'Digital');
});
