/**
 * Pieces shared by the views: the header with the views as tabs, the cards, the states.
 * The same pieces, and the same names, as the owner's other plugins' dashboards.
 */
import { Spinner } from '@wordpress/components';
import { __, _x, sprintf } from '@wordpress/i18n';

import { config, pageUrl } from './api';

const tabList = () => [
	[ 'projects', __( 'Projects', 'frascella' ) ],
	[ 'settings', __( 'Settings', 'frascella' ) ],
];

/** The header: icon, name, and the views as tabs. */
export function Header( { view, title, actions } ) {
	// Only the views this user may open: the server lists them in config.pages.
	const tabs = tabList().filter( ( [ key ] ) => config.pages?.[ key ] );

	return (
		<header className="frascella-header">
			<div className="frascella-header__top">
				<div className="frascella-brand">
					<img src={ config.icon } alt="" width="44" height="44" />
					<div>
						<span className="frascella-brand__kicker">
							{ sprintf(
								/* translators: %s: site name. */
								__( 'Portfolio · %s', 'frascella' ),
								config.site
							) }
						</span>
						<h1 className="frascella-brand__title">{ title }</h1>
					</div>
				</div>
				{ actions && <div className="frascella-header__actions">{ actions }</div> }
			</div>
			<nav className="frascella-tabs" aria-label={ __( 'Portfolio sections', 'frascella' ) }>
				{ tabs.map( ( [ key, label ] ) => (
					<a
						key={ key }
						href={ pageUrl( key ) }
						className={ 'frascella-tab' + ( key === view ? ' is-active' : '' ) }
						aria-current={ key === view ? 'page' : undefined }
					>
						{ label }
					</a>
				) ) }
			</nav>
		</header>
	);
}

export function Card( { title, subtitle, actions, children, className = '', flush = false } ) {
	return (
		<section className={ `frascella-card ${ className }` }>
			{ ( title || actions ) && (
				<div className="frascella-card__head">
					<div>
						{ title && <h2 className="frascella-card__title">{ title }</h2> }
						{ subtitle && <p className="frascella-card__subtitle">{ subtitle }</p> }
					</div>
					{ actions && <div className="frascella-card__actions">{ actions }</div> }
				</div>
			) }
			<div className={ flush ? 'frascella-card__body is-flush' : 'frascella-card__body' }>{ children }</div>
		</section>
	);
}

export function Loading( { label = __( 'Loading…', 'frascella' ) } ) {
	return (
		<div className="frascella-loading">
			<Spinner />
			<span>{ label }</span>
		</div>
	);
}

export function Empty( { title, children, action } ) {
	return (
		<div className="frascella-empty">
			<p className="frascella-empty__title">{ title }</p>
			{ children && <p className="frascella-empty__text">{ children }</p> }
			{ action }
		</div>
	);
}

const STATUS_CLASS = { draft: 'is-draft', published: 'is-sent' };
export const statusLabels = () => ( {
	draft: __( 'Draft', 'frascella' ),
	published: __( 'Published', 'frascella' ),
} );

/** The same statuses naming a group: a filter, a count. */
export const statusGroupLabels = () => ( {
	draft: _x( 'Drafts', 'projects in a list', 'frascella' ),
	published: _x( 'Published', 'projects in a list', 'frascella' ),
} );

export function StatusBadge( { status } ) {
	return <span className={ `frascella-badge ${ STATUS_CLASS[ status ] || '' }` }>{ statusLabels()[ status ] || status }</span>;
}

/** The languages of a project: filled for those it has, hollow for those it lacks. */
export function LangPills( { languages, have } ) {
	return (
		<span className="frascella-langs">
			{ languages.map( ( l ) => {
				const on = have[ l ];
				const title = on ? statusLabels()[ on.status ] : __( 'Not translated yet', 'frascella' );
				const cls = 'frascella-lang' + ( on ? ( on.status === 'published' ? ' is-published' : ' is-draft' ) : ' is-missing' );
				return (
					<span key={ l } className={ cls } title={ title }>
						{ l.toUpperCase() }
						<span className="screen-reader-text"> — { title }</span>
					</span>
				);
			} ) }
		</span>
	);
}
