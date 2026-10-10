export function readinessProbe(
  check,
  { ttl = 5000, timeout = 2000, clock = Date.now } = {},
) {
  let draining = false,
    cached = null,
    pending = null,
    checking = null,
    checkedAt = -Infinity;
  const result = (ready) => ({ status: ready ? "ready" : "unavailable" });
  async function run() {
    let timer;
    const work = Promise.resolve()
      .then(check)
      .then(
        (value) => value === true,
        () => false,
      );
    // Keep the underlying operation tracked after timeout to avoid unbounded retries.
    pending = work;
    work.finally(() => {
      if (pending === work) pending = null;
    });
    try {
      return await Promise.race([
        work,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(false), timeout);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    stop() {
      draining = true;
    },
    async read() {
      if (draining) return result(false);
      if (checking) {
        const ready = await checking;
        return result(!draining && ready);
      }
      if (clock() - checkedAt < ttl && cached !== null) return result(cached);
      if (pending) return result(false);
      checkedAt = clock();
      checking = run();
      try {
        cached = await checking;
      } finally {
        checking = null;
      }
      return result(!draining && cached);
    },
  };
}
