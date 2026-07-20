import { Bath, BedDouble, Building2, ChevronDown, Heart, MapPin, Menu, MoveRight, Search, SlidersHorizontal, Sparkles, Square, TreePine } from 'lucide-react';
import AgenticChatbot from './AgenticChatbot';

const properties = [
  { image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=85', tag: 'Featured', price: '$1,245,000', address: '1847 Pacific Heights Drive', place: 'San Francisco, CA', beds: '4 beds', baths: '3.5 baths', size: '2,840 sq ft' },
  { image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=85', tag: 'New listing', price: '$895,000', address: '1284 Elmwood Avenue', place: 'Oakland, CA', beds: '3 beds', baths: '2.5 baths', size: '2,140 sq ft' },
  { image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1100&q=85', tag: 'Open Sat 1–4', price: '$1,680,000', address: '74 Harbor View Terrace', place: 'Sausalito, CA', beds: '4 beds', baths: '3 baths', size: '3,120 sq ft' },
];

function PropertyCard({ property }) {
  return <article className="property-card">
    <div className="property-image"><img src={property.image} alt={property.address} /><span>{property.tag}</span><button aria-label={`Save ${property.address}`}><Heart size={18} /></button></div>
    <div className="property-info"><p className="property-price">{property.price}</p><h3>{property.address}</h3><p className="property-place"><MapPin size={14} /> {property.place}</p><div className="property-specs"><span><BedDouble size={16} /> {property.beds}</span><span><Bath size={16} /> {property.baths}</span><span><Square size={15} /> {property.size}</span></div><button className="detail-button">View details <MoveRight size={17} /></button></div>
  </article>;
}

export default function App() {
  return <main>
    <section className="hero">
      <nav><a className="brand" href="#top"><span>H</span> HAVEN</a><div className="nav-links"><a href="#properties">Buy</a><a href="#properties">Sell</a><a href="#about">Neighborhoods</a><a href="#about">Our story</a></div><button className="nav-cta">Speak with an advisor <MoveRight size={17} /></button><button className="mobile-menu" aria-label="Open menu"><Menu size={23} /></button></nav>
      <div className="hero-content" id="top"><div className="eyebrow"><Sparkles size={15} /> Curated homes. Human guidance.</div><h1>Find your next <em>sanctuary.</em></h1><p>Discover exceptional homes, thoughtfully matched to the life you want to live.</p>
        <form className="search-panel"><label><MapPin size={19} /><span>Location<small>City, neighborhood, or ZIP</small></span></label><label><span className="search-label-icon">$</span><span>Price range<small>Any price</small></span><ChevronDown size={18} /></label><label><Building2 size={19} /><span>Property type<small>All properties</small></span><ChevronDown size={18} /></label><button type="button"><Search size={19} /> Search homes</button></form>
      </div>
      <div className="hero-foot"><span><i /> New homes matched daily</span><span>Trusted by 12,000+ home seekers</span></div>
    </section>
    <section className="properties" id="properties"><div className="section-heading"><div><p className="section-kicker">Handpicked for you</p><h2>Homes worth coming home to.</h2></div><button className="all-properties">Explore all properties <MoveRight size={18} /></button></div><div className="property-grid">{properties.map((property) => <PropertyCard property={property} key={property.address} />)}</div></section>
    <section className="advisor-banner" id="about"><div className="banner-mark"><TreePine size={34} /></div><div><p className="section-kicker">A better way home</p><h2>Expert advice, on your terms.</h2><p>From the first search to the final signature, our local advisors pair intelligence with an exceptionally personal experience.</p></div><button>Meet our advisors <MoveRight size={18} /></button></section>
    <button className="filter-chip"><SlidersHorizontal size={18} /> Refine your search</button>
    <AgenticChatbot />
  </main>;
}
