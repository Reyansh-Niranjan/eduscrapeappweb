import { motion } from 'framer-motion';

export default function About() {
  return (
    <section id="about" className="py-20 relative" style={{ background: 'var(--theme-bg-secondary)' }}>
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{ color: 'var(--theme-text)' }}
          >
            Why <span className="text-purple-600">EduScrapeApp</span> Matters
          </motion.h2>
          <motion.div
            className="w-20 h-1 bg-purple-600 mx-auto mb-12"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          ></motion.div>

          <div
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <motion.div
              className="text-left"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="text-lg mb-6 leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                EduScrapeApp streamlines how schools and tutoring centres gather learning materials. Instead of manually
                copying resources from dozens of sites, educators define a topic once and let EduScrapeApp surface the
                most relevant content, complete with readability grading and citation tracking.
              </p>

              <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                Built for curriculum teams, administrators, and classroom teachers alike, the platform reduces prep time,
                keeps lesson plans aligned with standards, and provides one-click sharing to any device.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <motion.div
                  className="card text-center"
                  style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}
                  whileHover={{ y: -5, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="text-4xl font-bold text-teal-600 mb-2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    viewport={{ once: true }}
                  >
                    85%
                  </motion.div>
                  <div className="font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Prep Time Saved</div>
                </motion.div>
                <motion.div
                  className="card text-center"
                  style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}
                  whileHover={{ y: -5, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="text-4xl font-bold text-purple-600 mb-2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    viewport={{ once: true }}
                  >
                    10k+
                  </motion.div>
                  <div className="font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Curated Resources</div>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="card p-12"
                style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center">
                  <motion.div
                    className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                    initial={{ rotate: -180, scale: 0 }}
                    whileInView={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                  >
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--theme-text)' }}>Built for Classrooms</h3>
                  <p style={{ color: 'var(--theme-text-secondary)' }}>Secure, scalable infrastructure that keeps educators in control of every source.</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
