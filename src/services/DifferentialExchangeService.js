class DifferentialExchangeService {
  /**
   * Calcula el diferencial cambiario en Bolívares entre la emisión del documento y la fecha actual.
   */
  static calculateGainLoss({ montoUsd, tasaOrigen, tasaActualBcv }) {
    const equivalenteOrigenBs = montoUsd * tasaOrigen;
    const equivalenteActualBs = montoUsd * tasaActualBcv;
    const diferencialBs = equivalenteActualBs - equivalenteOrigenBs;

    return {
      montoUsd,
      tasaOrigen,
      tasaActualBcv,
      equivalenteOrigenBs,
      equivalenteActualBs,
      diferencialBs,
      esPerdida: diferencialBs < 0,
      esGanancia: diferencialBs > 0
    };
  }
}

module.exports = DifferentialExchangeService;
