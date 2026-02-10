export function AuthIntro() {
  return (
    <div className="hidden md:flex flex-col gap-4 pr-10">
      <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#f77f00]">
        NUNDO · Côte d&apos;Ivoire
      </p>
      <h1 className="text-3xl font-semibold leading-tight">
        Accède à des talents locaux
        <span className="text-[#f77f00]"> fiables</span>, en toute simplicité.
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Chauffeurs, servantes, gérants de bar, vigiles, secrétaires… NUNDO sécurise la
        mise en relation avec badges de vérification et paiements Mobile Money.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-gray-600">
        <div className="rounded-xl bg-white/70 shadow-sm px-3 py-2 border border-orange-50">
          <p className="font-semibold text-xs text-[#f77f00]">Profils vérifiés</p>
          <p>Validation par téléphone et historique des missions.</p>
        </div>
        <div className="rounded-xl bg-white/70 shadow-sm px-3 py-2 border border-emerald-50">
          <p className="font-semibold text-xs text-[#009e60]">Paiements simples</p>
          <p>Orange Money, MTN, Wave, en quelques clics.</p>
        </div>
      </div>
    </div>
  );
}

