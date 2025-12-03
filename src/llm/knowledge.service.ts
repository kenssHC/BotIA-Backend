import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface Formula {
  id: string;
  question: string;
  formula: string;
  requiredColumns: string[];
}

interface FormulaCategory {
  id: string;
  name: string;
  formulas: Formula[];
}

interface FormulasData {
  categories: FormulaCategory[];
}

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

interface PromptsData {
  systemPrompts: Record<string, PromptTemplate>;
  templatePrompts: Record<string, PromptTemplate>;
  qaPrompt: PromptTemplate;
}

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private formulas: FormulasData;
  private prompts: PromptsData;

  onModuleInit() {
    this.loadKnowledge();
  }

  private loadKnowledge() {
    try {
      // Cargar fórmulas
      const formulasPath = path.join(__dirname, 'knowledge', 'formulas.json');
      const formulasContent = fs.readFileSync(formulasPath, 'utf-8');
      this.formulas = JSON.parse(formulasContent);
      this.logger.log(`✅ Cargadas ${this.getTotalFormulas()} fórmulas en ${this.formulas.categories.length} categorías`);

      // Cargar prompts
      const promptsPath = path.join(__dirname, 'knowledge', 'prompts.json');
      const promptsContent = fs.readFileSync(promptsPath, 'utf-8');
      this.prompts = JSON.parse(promptsContent);
      this.logger.log(`✅ Cargados prompts: ${Object.keys(this.prompts.systemPrompts).length} system, ${Object.keys(this.prompts.templatePrompts).length} templates`);
    } catch (error) {
      this.logger.error('Error cargando conocimiento:', error);
      // Inicializar con valores vacíos si falla
      this.formulas = { categories: [] };
      this.prompts = { systemPrompts: {}, templatePrompts: {}, qaPrompt: { id: 'placeholder', name: 'N/A', content: '' }, };
    }
  }

  private getTotalFormulas(): number {
    return this.formulas.categories.reduce((sum, cat) => sum + cat.formulas.length, 0);
  }

  /**
   * Obtiene todas las categorías de fórmulas
   */
  getAllCategories(): FormulaCategory[] {
    return this.formulas.categories;
  }

  /**
   * Obtiene fórmulas por categoría
   */
  getFormulasByCategory(categoryId: string): Formula[] {
    const category = this.formulas.categories.find(c => c.id === categoryId);
    return category?.formulas || [];
  }

  /**
   * Obtiene todas las fórmulas como texto formateado para el prompt
   */
  getFormulasAsPromptText(): string {
    const sections = this.formulas.categories.map(category => {
      const formulas = category.formulas.map(f => 
        `  • ${f.question}\n    Fórmula: ${f.formula}`
      ).join('\n\n');
      
      return `### ${category.name}\n${formulas}`;
    });

    return `## 📐 FÓRMULAS DISPONIBLES PARA CÁLCULOS\n\n${sections.join('\n\n')}`;
  }

  /**
   * Obtiene fórmulas relevantes basadas en palabras clave de la consulta
   */
  getRelevantFormulas(query: string): Formula[] {
    const queryLower = query.toLowerCase();
    const relevantFormulas: Formula[] = [];

    // Palabras clave para cada categoría
    const categoryKeywords = {
      volumen_conversiones: ['conversiones', 'leads', 'tendencia', 'promedio', 'diario', 'semanal', 'comparar', 'mes'],
      eficiencia_costos: ['cpa', 'costo', 'roas', 'eficiencia', 'retorno', 'inversión', 'gasto'],
      participacion_resultados: ['porcentaje', 'participación', 'contribución', 'whatsapp', 'remarketing', 'mobile', 'video']
    };

    for (const category of this.formulas.categories) {
      const keywords = categoryKeywords[category.id] || [];
      const isRelevant = keywords.some(kw => queryLower.includes(kw));
      
      if (isRelevant) {
        // Agregar fórmulas de categorías relevantes
        relevantFormulas.push(...category.formulas.filter(f => 
          f.question.toLowerCase().split(' ').some(word => 
            queryLower.includes(word) && word.length > 3
          )
        ));
      }
    }

    // Si no encontramos nada específico, devolver las más comunes
    if (relevantFormulas.length === 0) {
      return this.formulas.categories.flatMap(c => c.formulas.slice(0, 2));
    }

    return relevantFormulas.slice(0, 10); // Limitar a 10 fórmulas
  }

  /**
   * Obtiene el prompt maestro del sistema
   */
  getMasterSystemPrompt(): string {
    return this.prompts.systemPrompts.master?.content || '';
  }

  /**
   * Obtiene el prompt genérico para consultas
   */
  getQueryPrompt(query: string): string {
    const template = this.prompts.systemPrompts.query?.content || '';
    return template.replace('{{QUERY}}', query);
  }

  /**
   * Obtiene un template de prompt específico
   */
  getTemplatePrompt(templateId: string, variables: Record<string, string> = {}): string {
    const template = this.prompts.templatePrompts[templateId];
    if (!template) return '';

    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return content;
  }

  /**
   * Detecta qué tipo de análisis se está pidiendo basado en la consulta
   */
  detectAnalysisType(query: string): string {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('cpa') || queryLower.includes('costo') || queryLower.includes('roas') || queryLower.includes('eficiencia')) {
      return 'eficiencia_costos';
    }
    
    if (queryLower.includes('porcentaje') || queryLower.includes('participación') || queryLower.includes('contribución') || queryLower.includes('remarketing')) {
      return 'participacion_resultados';
    }

    if (queryLower.includes('reporte') || queryLower.includes('ejecutivo') || queryLower.includes('semanal') || queryLower.includes('mensual')) {
      return 'reporte_ejecutivo';
    }

    // Por defecto, volumen de conversiones
    return 'volumen_conversiones';
  }

  /**
   * Construye el prompt completo para una consulta
   */
  buildFullQueryPrompt(query: string): { systemPrompt: string; userPrompt: string } {
    const masterPrompt = this.getMasterSystemPrompt();
    const relevantFormulas = this.getRelevantFormulas(query);
    
    const formulasText = relevantFormulas.length > 0
      ? `\n\n## 📐 FÓRMULAS RELEVANTES PARA ESTA CONSULTA\n${relevantFormulas.map(f => `• ${f.question}\n  Fórmula: ${f.formula}`).join('\n\n')}`
      : '';

    const systemPrompt = `${masterPrompt}${formulasText}`;
    const userPrompt = this.getQueryPrompt(query);

    return { systemPrompt, userPrompt };
  }

  /**
   * Construye el prompt completo para un reporte
   */
  buildReportPrompt(instruction: string): { systemPrompt: string; userPrompt: string } {
    const masterPrompt = this.getMasterSystemPrompt();
    const allFormulas = this.getFormulasAsPromptText();
    const reportTemplate = this.getTemplatePrompt('reporte_ejecutivo', { INSTRUCTION: instruction });

    const systemPrompt = `${masterPrompt}\n\n${allFormulas}`;
    const userPrompt = reportTemplate;

    return { systemPrompt, userPrompt };
  }

  /**
   * Obtiene estadísticas del conocimiento cargado
   */
  getKnowledgeStats(): any {
    return {
      totalFormulas: this.getTotalFormulas(),
      categories: this.formulas.categories.map(c => ({
        id: c.id,
        name: c.name,
        formulasCount: c.formulas.length
      })),
      systemPrompts: Object.keys(this.prompts.systemPrompts),
      templatePrompts: Object.keys(this.prompts.templatePrompts),
      hasQaPrompt: !!this.prompts.qaPrompt
    };
  }
}

