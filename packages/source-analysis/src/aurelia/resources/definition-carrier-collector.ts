import { DefinitionCarrier, DefinitionFieldContribution } from './definition-carrier.js';
import type { ResourceCandidate } from './resource-candidate.js';
import { ResourceRecognizer } from './resource-recognizer.js';

export interface DefinitionCarrierCollectorOptions {
  readonly recognizer: ResourceRecognizer;
}

export interface DefinitionCarrierCollectorState {
  readonly exportOwnerLabel: string;
}

// This seam translates recognized candidates into field-contributing carriers.
// It intentionally stops before full convergence. Real precedence/merge law
// still belongs in a later materialization layer.
export class DefinitionCarrierCollector {
  private readonly recognizerValue: ResourceRecognizer;

  constructor(
    options: DefinitionCarrierCollectorOptions,
  ) {
    this.recognizerValue = options.recognizer;
  }

  collectAll(): readonly DefinitionCarrier[] {
    return this.recognizerValue.recognizeAll().flatMap((candidate) => this.collectCandidate(candidate));
  }

  collectCandidate(
    candidate: ResourceCandidate,
  ): readonly DefinitionCarrier[] {
    return candidate.carriers.map((carrier, index) => new DefinitionCarrier(
      `${candidate.id}:definition-carrier:${carrier.kind}:${index}`,
      candidate,
      carrier.kind,
      candidate.possibleKinds,
      contributionsFor(candidate, carrier.kind),
      carrier.note,
    ));
  }

  inspectState(): DefinitionCarrierCollectorState {
    return {
      exportOwnerLabel: this.recognizerValue.inspectState().exportOwnerLabel,
    };
  }
}

function contributionsFor(
  candidate: ResourceCandidate,
  carrierKind: DefinitionCarrier['carrierKind'],
): readonly DefinitionFieldContribution[] {
  switch (carrierKind) {
    case 'decorator':
      return [
        new DefinitionFieldContribution(
          'name',
          'open',
          'decorator',
          null,
          'Decorator carriers may contribute canonical resource naming once decorator recovery exists.',
        ),
        new DefinitionFieldContribution(
          'aliases',
          'open',
          'decorator',
          null,
          'Decorator carriers may also contribute aliases.',
        ),
      ];
    case 'definition-object':
      return [
        new DefinitionFieldContribution(
          'name',
          'open',
          'define-call',
          null,
          'Imperative define-call object carriers may contribute canonical naming.',
        ),
        new DefinitionFieldContribution(
          'aliases',
          'open',
          'define-call',
          null,
          'Imperative define-call object carriers may also contribute aliases.',
        ),
        new DefinitionFieldContribution(
          'bindables',
          'open',
          'define-call',
          null,
          'Imperative define-call object carriers may contribute bindables and related policy.',
        ),
      ];
    case 'static-au':
      return [
        new DefinitionFieldContribution(
          'name',
          'open',
          'static-$au',
          null,
          'Static $au carriers may contribute merged-definition naming.',
        ),
        new DefinitionFieldContribution(
          'bindables',
          'open',
          'static-$au',
          null,
          'Static $au carriers may contribute bindables.',
        ),
      ];
    case 'registrable-metadata':
      return [
        new DefinitionFieldContribution(
          'name',
          'open',
          'registrable-metadata',
          null,
          'Registrable metadata may contribute resource naming or family-specific metadata.',
        ),
      ];
    case 'configuration-emission':
      return [
        new DefinitionFieldContribution(
          'aliases',
          'open',
          'register-method',
          null,
          'Configuration emission may synthesize aliases or other settings-world artifacts.',
        ),
      ];
    case 'convention':
      return [
        new DefinitionFieldContribution(
          'name',
          'open',
          'convention',
          candidate.sourceExport.name,
          'Convention lanes may derive candidate naming from export identity, but should not be treated as closed without explicit law.',
        ),
      ];
  }
}
