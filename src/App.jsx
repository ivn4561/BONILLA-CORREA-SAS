import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <nav>
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-name">Bonilla · Correa <span style={{color:'var(--gold)'}}>S.A.S.</span></div>
            <div className="nav-logo-sub">Solutions Legalis</div>
          </div>
          <div className="nav-links">
            <a href="#nosotros">Nosotros</a>
            <a href="#servicios">Servicios</a>
            <a href="#equipo">Equipo</a>
            <a href="#contacto">Contacto</a>
            <a href="#contacto" className="nav-cta">Consulta inicial</a>
          </div>
          <div className="nav-mobile">Menú</div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-grid"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-tag"><span>Derecho · Estrategia · Resultados</span></div>
            <h1>Soluciones legales <em>de alto nivel</em> para su empresa</h1>
            <p className="hero-desc">Especializados en contratación estatal y derecho empresarial. Asesoramos a empresas y particulares en sus procesos jurídicos con presencia en cuatro países.</p>
            <div className="hero-actions">
              <a href="#contacto" className="btn-primary">Agendar consulta</a>
              <a href="#servicios" className="btn-outline">Nuestros servicios</a>
            </div>
            <div className="hero-offices">
              <span className="office-tag">Bogotá</span>
              <span className="office-tag">Paris</span>
              <span className="office-tag">Madrid</span>
              <span className="office-tag">Miami</span>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-stat">
              <div className="hero-stat-num">+20</div>
              <div className="hero-stat-label">Años de experiencia en derecho empresarial</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">+500</div>
              <div className="hero-stat-label">Casos resueltos exitosamente</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">4</div>
              <div className="hero-stat-label">Países con presencia activa</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">98%</div>
              <div className="hero-stat-label">Tasa de satisfacción de clientes</div>
            </div>
          </div>
        </div>
      </section>

      <div className="gold-bar"></div>

      <section className="about" id="nosotros">
        <div className="section-inner">
          <div className="section-tag"><span>Quiénes somos</span></div>
          <div className="about-grid">
            <div>
              <h2 className="section-title">Un despacho con visión internacional y compromiso local</h2>
              <p className="about-text">Bonilla · Correa S.A.S. nació de la convicción de que el derecho debe ser una herramienta efectiva al servicio de las personas y las empresas. Con presencia en Bogotá, Paris, Madrid y Miami, ofrecemos asesoría jurídica integral con estándares internacionales.</p>
              <p className="about-text">Nuestra especialización en contratación estatal nos posiciona como referentes en el sector, acompañando a empresas en todos sus procesos de contratación con el Estado colombiano y en jurisdicciones internacionales.</p>
              <a href="#contacto" className="btn-primary" style={{display:'inline-block',marginTop:'1.5rem'}}>Conocernos mejor</a>
            </div>
            <div>
              <div className="about-quote">"El derecho no es un fin en sí mismo, sino el instrumento más poderoso para construir relaciones justas y negocios sólidos."</div>
              <div className="about-values">
                <div className="about-value">
                  <div className="about-value-icon">⚖</div>
                  <div><h4>Rigor jurídico</h4><p>Análisis profundo y actualizado de cada caso, sin excepciones.</p></div>
                </div>
                <div className="about-value">
                  <div className="about-value-icon">🌐</div>
                  <div><h4>Visión internacional</h4><p>Perspectiva global con conocimiento local en cada jurisdicción.</p></div>
                </div>
                <div className="about-value">
                  <div className="about-value-icon">🤝</div>
                  <div><h4>Compromiso real</h4><p>Sus resultados son nuestros resultados. Acompañamiento total.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="services" id="servicios">
        <div className="section-inner">
          <div className="section-tag"><span>Áreas de práctica</span></div>
          <h2 className="section-title">Cobertura jurídica integral</h2>
          <p className="section-sub">Abordamos todas las ramas del derecho con equipos especializados, garantizando la mejor estrategia para cada situación.</p>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-num">01</div>
              <div className="service-title">Contratación Estatal</div>
              <p className="service-desc">Nuestra especialidad principal. Asesoramos en procesos licitatorios, estructuración de propuestas, impugnaciones y ejecución de contratos con entidades públicas colombianas e internacionales.</p>
              <div className="service-tag">Especialidad principal</div>
            </div>
            <div className="service-card">
              <div className="service-num">02</div>
              <div className="service-title">Derecho Corporativo y Mercantil</div>
              <p className="service-desc">Constitución de sociedades, fusiones y adquisiciones, contratos comerciales, due diligence y estructuración jurídica de negocios nacionales e internacionales.</p>
              <div className="service-tag">Empresas</div>
            </div>
            <div className="service-card">
              <div className="service-num">03</div>
              <div className="service-title">Derecho Civil</div>
              <p className="service-desc">Contratos, responsabilidad civil, sucesiones, bienes y obligaciones. Representación y asesoría en todas las instancias judiciales y extrajudiciales.</p>
              <div className="service-tag">Personas y empresas</div>
            </div>
            <div className="service-card">
              <div className="service-num">04</div>
              <div className="service-title">Derecho Laboral</div>
              <p className="service-desc">Relaciones laborales individuales y colectivas, negociación de convenios, despidos, procesos ante el Ministerio de Trabajo y litigios laborales.</p>
              <div className="service-tag">Empleadores y trabajadores</div>
            </div>
            <div className="service-card">
              <div className="service-num">05</div>
              <div className="service-title">Derecho Penal</div>
              <p className="service-desc">Defensa penal en todas las etapas procesales, delitos económicos y empresariales, compliance penal y representación de víctimas.</p>
              <div className="service-tag">Defensa y representación</div>
            </div>
            <div className="service-card">
              <div className="service-num">06</div>
              <div className="service-title">Derecho de Familia</div>
              <p className="service-desc">Divorcios, custodia, alimentos, liquidación de sociedades conyugales y adopciones. Enfoque conciliatorio con capacidad litigiosa plena.</p>
              <div className="service-tag">Familia</div>
            </div>
          </div>
        </div>
      </section>

      <section className="team" id="equipo">
        <div className="section-inner">
          <div className="section-tag"><span>Nuestro equipo</span></div>
          <h2 className="section-title">Los mejores a su lado</h2>
          <p className="section-sub">Un equipo de abogados con formación internacional y experiencia comprobada en cada área de práctica.</p>
          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar">BC</div>
              <div className="team-name">Bonilla · Correa</div>
              <div className="team-role">Socios Fundadores</div>
              <div className="team-spec">Especialistas en contratación estatal y derecho corporativo internacional</div>
            </div>
            <div className="team-card">
              <div className="team-avatar">DL</div>
              <div className="team-name">Departamento Legal</div>
              <div className="team-role">Equipo de Litigantes</div>
              <div className="team-spec">Abogados especializados en derecho civil, penal y laboral con experiencia en litigio</div>
            </div>
            <div className="team-card">
              <div className="team-avatar">AI</div>
              <div className="team-name">Área Internacional</div>
              <div className="team-role">Oficinas Internacionales</div>
              <div className="team-spec">Presencia activa en Paris, Madrid y Miami para asuntos de jurisdicción internacional</div>
            </div>
            <div className="team-card">
              <div className="team-avatar">CE</div>
              <div className="team-name">Consultoría Estatal</div>
              <div className="team-role">Especialistas en Contratación</div>
              <div className="team-spec">Equipo dedicado exclusivamente a procesos de contratación con entidades públicas</div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact" id="contacto">
        <div className="section-inner">
          <div className="section-tag"><span>Contacto</span></div>
          <h2 className="section-title">Hablemos de su caso</h2>
          <div className="contact-grid">
            <div>
              <p className="section-sub" style={{marginBottom:'2rem'}}>La primera consulta es el primer paso. Cuéntenos su situación y le orientamos sobre la mejor estrategia jurídica.</p>
              <div className="contact-info">
                <div className="contact-item">
                  <div className="contact-dot"></div>
                  <div>
                    <div className="contact-item-label">Sede principal</div>
                    <div className="contact-item-value">Bogotá, Colombia</div>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-dot"></div>
                  <div>
                    <div className="contact-item-label">Correo electrónico</div>
                    <div className="contact-item-value">contacto@bonillacorrea.com</div>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-dot"></div>
                  <div>
                    <div className="contact-item-label">Atención</div>
                    <div className="contact-item-value">Lunes a viernes · 8:00 – 18:00</div>
                  </div>
                </div>
              </div>
              <div className="contact-offices">
                <div className="contact-offices-label">Nuestras oficinas</div>
                <div className="offices-list">
                  <div className="office-item">Bogotá — Sede principal</div>
                  <div className="office-item">Paris — Oficina Europa</div>
                  <div className="office-item">Madrid — Oficina España</div>
                  <div className="office-item">Miami — Oficina EE.UU.</div>
                </div>
              </div>
            </div>
            <div className="form">
              <div className="form-title">Solicitar consulta</div>
              <div className="form-sub">Le responderemos en menos de 24 horas hábiles.</div>
              <div className="form-row">
                <div className="form-group"><label>Nombre</label><input type="text" placeholder="Su nombre completo" /></div>
                <div className="form-group"><label>Email</label><input type="email" placeholder="su@email.com" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Teléfono</label><input type="tel" placeholder="+57 000 000 0000" /></div>
                <div className="form-group">
                  <label>Área de interés</label>
                  <select>
                    <option>Contratación Estatal</option>
                    <option>Derecho Corporativo</option>
                    <option>Derecho Civil</option>
                    <option>Derecho Laboral</option>
                    <option>Derecho Penal</option>
                    <option>Derecho de Familia</option>
                    <option>Otro</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Descripción del caso</label><textarea placeholder="Describa brevemente su situación jurídica..."></textarea></div>
              <button className="form-submit">Enviar consulta</button>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-logo">Bonilla · <span>Correa</span> S.A.S.</div>
          <div className="footer-links">
            <a href="#nosotros">Nosotros</a>
            <a href="#servicios">Servicios</a>
            <a href="#equipo">Equipo</a>
            <a href="#contacto">Contacto</a>
          </div>
          <div className="footer-copy">© 2026 Bonilla · Correa S.A.S. · Solutions Legalis · Todos los derechos reservados</div>
        </div>
      </footer>
    </>
  )
}
