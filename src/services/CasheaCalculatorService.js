class CasheaCalculatorService {
  /**
   * Desglosa una compra en 50% pago inicial hoy y 3 cuotas quincenales sin interés.
   */
  static calculateInstallments({ totalUsd, tasaBcv }) {
    const inicialUsd = totalUsd * 0.50;
    const cuotaUsd = (totalUsd - inicialUsd) / 3;

    const inicialBs = inicialUsd * tasaBcv;
    const cuotaBs = cuotaUsd * tasaBcv;

    return {
      totalUsd,
      totalBs: totalUsd * tasaBcv,
      tasaBcv,
      pagoInicial: {
        usd: parseFloat(inicialUsd.toFixed(2)),
        bs: parseFloat(inicialBs.toFixed(2))
      },
      cuotas: [
        { num: 1, dias: 14, usd: parseFloat(cuotaUsd.toFixed(2)), bs: parseFloat(cuotaBs.toFixed(2)) },
        { num: 2, dias: 28, usd: parseFloat(cuotaUsd.toFixed(2)), bs: parseFloat(cuotaBs.toFixed(2)) },
        { num: 3, dias: 42, usd: parseFloat(cuotaUsd.toFixed(2)), bs: parseFloat(cuotaBs.toFixed(2)) }
      ]
    };
  }
}

module.exports = CasheaCalculatorService;
