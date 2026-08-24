import { Fragment } from 'react'
import { ArrowUpRight, HandHeart, MapPin, ShieldCheck, Users } from 'lucide-react'
import { openCommunityContact } from './CommunityContactWidget'
import { AppLink } from './router'
import { LanguageToggle, useI18n } from './i18n'

function MultilineTitle({ text }: { text: string }) {
  const lines = text.split('\n')
  return <>{lines.map((line, index) => <Fragment key={line}>{index > 0 && <br />}{line}</Fragment>)}</>
}

export function LandingPage() {
  const { t } = useI18n()
  return <div className="landing-page food-entry-page">
    <a className="landing-skip" href="#choose-a-path">{t('landing.skip')}</a>
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="yuhm home"><span>/yuhm <b aria-hidden="true">♥</b></span><small>regenerative food network · Austin</small></a>
      <div className="landing-nav-actions"><LanguageToggle /><button className="landing-feedback" type="button" onClick={() => openCommunityContact('feedback')}>{t('common.feedback')}</button><AppLink href="/app/?mode=login">{t('common.signIn')}</AppLink><a className="landing-handoff" href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol <ArrowUpRight size={14} /></a></div>
    </header>
    <main className="food-entry-main">
      <section className="food-entry-intro" aria-labelledby="food-entry-title">
        <p className="landing-kicker"><span /> {t('landing.kicker')}</p>
        <h1 id="food-entry-title"><MultilineTitle text={t('landing.title')} /></h1>
        <p>{t('landing.intro')}</p>
        <div className="food-entry-proof"><ShieldCheck size={16} /><span>{t('landing.proof')}</span></div>
      </section>
      <section className="entry-paths" id="choose-a-path" aria-labelledby="choose-path-title">
        <div className="entry-paths-heading"><p className="landing-kicker"><span /> {t('landing.startHere')}</p><h2 id="choose-path-title">{t('landing.choosePath')}</h2></div>
        <div className="entry-path-list entry-path-list-three">
          <AppLink className="entry-path entry-path-food" href="/app/?mode=anonymous&intent=food">
            <span className="entry-path-icon"><MapPin size={25} /></span>
            <span className="entry-path-copy"><small>{t('landing.needFood.small')}</small><strong>{t('landing.needFood.title')}</strong><span>{t('landing.needFood.copy')}</span></span>
            <span className="entry-path-action">{t('landing.needFood.action')} <ArrowUpRight size={18} /></span>
          </AppLink>
          <AppLink className="entry-path entry-path-contributor" href="/app/?mode=anonymous&intent=contribute">
            <span className="entry-path-icon"><HandHeart size={25} /></span>
            <span className="entry-path-copy"><small>{t('landing.contribute.small')}</small><strong>{t('landing.contribute.title')}</strong><span>{t('landing.contribute.copy')}</span></span>
            <span className="entry-path-action">{t('landing.contribute.action')} <ArrowUpRight size={18} /></span>
          </AppLink>
          <AppLink className="entry-path entry-path-gather" href="/app/?mode=anonymous&intent=gather">
            <span className="entry-path-icon"><Users size={25} /></span>
            <span className="entry-path-copy"><small>{t('landing.gather.small')}</small><strong>{t('landing.gather.title')}</strong><span>{t('landing.gather.copy')}</span></span>
            <span className="entry-path-action">{t('landing.gather.action')} <ArrowUpRight size={18} /></span>
          </AppLink>
        </div>
        <p className="entry-request-note">{t('landing.requestNote')} <AppLink href="/app/?mode=anonymous&intent=request">{t('landing.requestLink')}</AppLink>.</p>
        <p className="entry-updates-note">{t('landing.updatesNote')} <AppLink href="/app/?mode=login&updates=1">{t('landing.updatesLink')}</AppLink>. {t('landing.updatesNoAccount')}</p>
      </section>
    </main>
    <footer className="landing-footer"><span>{t('landing.footer.city')}</span><span>{t('landing.footer.coordinated')}</span><span>{t('landing.footer.partOf')} <a href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol</a></span></footer>
  </div>
}
