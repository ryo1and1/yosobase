insert into public.teams (id, name, league) values
  ('GIANTS', '読売ジャイアンツ', 'NPB'),
  ('TIGERS', '阪神タイガース', 'NPB'),
  ('BAYSTARS', '横浜DeNAベイスターズ', 'NPB'),
  ('CARP', '広島東洋カープ', 'NPB'),
  ('SWALLOWS', '東京ヤクルトスワローズ', 'NPB'),
  ('DRAGONS', '中日ドラゴンズ', 'NPB'),
  ('HAWKS', '福岡ソフトバンクホークス', 'NPB'),
  ('FIGHTERS', '北海道日本ハムファイターズ', 'NPB'),
  ('MARINES', '千葉ロッテマリーンズ', 'NPB'),
  ('EAGLES', '東北楽天ゴールデンイーグルス', 'NPB'),
  ('LIONS', '埼玉西武ライオンズ', 'NPB'),
  ('BUFFALOES', 'オリックス・バファローズ', 'NPB')
on conflict (id) do update set
  name = excluded.name,
  league = excluded.league;
