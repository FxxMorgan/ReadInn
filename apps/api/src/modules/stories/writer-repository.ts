import { Prisma } from '@prisma/client';
import { prisma, checkDatabaseConnection } from '../../shared/db.js';
import { storyFixtures, chapterFixtures, type StorySummary } from './story-fixtures.js';
import { storyTagKind } from './story-taxonomy.js';

const offlineStoriesByAuthor = new Map<string, StorySummary[]>();
const offlineChapterMeta = new Map<string, { authorId: string; status: string; contentVersion: number; updatedAt: string }>();
const offlineRevisions = new Map<string, Array<{ id: string; version: number; title: string; content: unknown; plainText: string; reason: string; createdAt: string }>>();

export interface CreateStoryParams { authorId: string; title: string; synopsis: string; genres: string[]; tags: string[]; isMature?: boolean; coverColor?: string; status?: 'draft' | 'published' }
export interface UpdateStoryParams { authorId: string; storyId: string; title?: string; synopsis?: string; genres?: string[]; tags?: string[]; isMature?: boolean; coverColor?: string | null }
export interface CreateChapterParams { storyId: string; title: string; content: unknown; status?: 'draft' | 'published' }
export interface UpdateChapterParams { chapterId: string; authorId: string; title: string; content: unknown; plainText: string; expectedVersion: number }

function slugify(value: string, fallback: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fallback; }
function contentToParagraphs(content: unknown): string[] { if (Array.isArray(content)) return content.map(String); if (content && typeof content === 'object' && 'content' in content) { const nodes = (content as { content?: Array<{ content?: Array<{ text?: string }> }> }).content ?? []; return nodes.map((node) => node.content?.map((part) => part.text ?? '').join('') ?? '').filter(Boolean); } return [String(content ?? '')].filter(Boolean); }
function metrics(plainText: string) { const wordCount = plainText.split(/\s+/).filter(Boolean).length; return { wordCount, estimatedReadMin: Math.max(1, Math.ceil(wordCount / 200)) }; }
async function resolveGenres(names:string[]){return Promise.all([...new Set(names)].map(async(name)=>{const existing=await prisma.genre.findFirst({where:{name:{equals:name,mode:'insensitive'}}});return existing??prisma.genre.create({data:{name,slug:`${slugify(name,'general')}-${Math.random().toString(36).slice(2,7)}`}})}));}
async function resolveTags(names:string[]){return Promise.all([...new Set(names)].map(async(name)=>{const kind=storyTagKind(name);if(!kind)throw new Error(`Etiqueta no permitida: ${name}`);const existing=await prisma.tag.findFirst({where:{name:{equals:name,mode:'insensitive'}}});return existing??prisma.tag.create({data:{name,kind,slug:`${slugify(name,'tag')}-${Math.random().toString(36).slice(2,7)}`}})}));}

export class WriterRepository {
  async getAllStories(includeArchived = false): Promise<StorySummary[]> {
    if (!(await checkDatabaseConnection())) {
      return Array.from(offlineStoriesByAuthor.values())
        .flat()
        .filter((story) => includeArchived || story.status !== 'archived');
    }
    const stories = await prisma.story.findMany({ where: includeArchived ? {} : { status: { not: 'archived' } }, orderBy: { updatedAt: 'desc' }, include: { author: { include: { profile: true } }, genres: { include: { genre: true } }, tags: { include: { tag: true } }, _count: { select: { chapters: true } } } });
    return stories.map((story) => ({ id: story.id, title: story.title, author: story.attributionName ?? story.author.profile?.displayName ?? story.author.username, authorUsername: story.author.username, synopsis: story.synopsis, genre: story.genres[0]?.genre.name ?? 'General', genres:story.genres.map((item)=>item.genre.name),tags:story.tags.map((item)=>({name:item.tag.name,kind:item.tag.kind})),languageCode:story.languageCode,status: story.status, chapterCount: story._count.chapters, isMature: story.isMature, coverColor: story.coverUrl ?? '#855300', updatedAt: story.updatedAt.toISOString() }));
  }

  async getUserStories(authorId: string, includeArchived = false): Promise<StorySummary[]> {
    if (!(await checkDatabaseConnection())) return (offlineStoriesByAuthor.get(authorId) ?? []).filter((story) => includeArchived || story.status !== 'archived');
    const stories = await prisma.story.findMany({ where: { authorId, ...(includeArchived ? {} : { status: { not: 'archived' } }) }, orderBy: { updatedAt: 'desc' }, include: { author: { include: { profile: true } }, genres: { include: { genre: true } }, tags: { include: { tag: true } }, _count: { select: { chapters: true } } } });
    return stories.map((story) => ({ id: story.id, title: story.title, author: story.attributionName ?? story.author.profile?.displayName ?? story.author.username, authorUsername: story.author.username, synopsis: story.synopsis, genre: story.genres[0]?.genre.name ?? 'General', genres:story.genres.map((item)=>item.genre.name),tags:story.tags.map((item)=>({name:item.tag.name,kind:item.tag.kind})),languageCode:story.languageCode,status: story.status, chapterCount: story._count.chapters, isMature: story.isMature, coverColor: story.coverUrl ?? '#855300', updatedAt: story.updatedAt.toISOString() }));
  }

  async getUserStory(authorId: string, storyId: string) {
    if (!(await checkDatabaseConnection())) { const summary=(offlineStoriesByAuthor.get(authorId)??[]).find((story)=>story.id===storyId); if(!summary)return null; return {...summary,chapters:chapterFixtures.filter((chapter)=>chapter.storyId===storyId).map((chapter)=>({...chapter,status:offlineChapterMeta.get(chapter.id)?.status??'draft'}))}; }
    const story=await prisma.story.findFirst({where:{id:storyId,authorId},include:{author:{include:{profile:true}},genres:{include:{genre:true}},tags:{include:{tag:true}},chapters:{where:{status:{not:'archived'}},orderBy:{position:'asc'},select:{id:true,storyId:true,position:true,title:true,status:true,wordCount:true,updatedAt:true}}}});if(!story)return null;
    return {id:story.id,title:story.title,author:story.attributionName??story.author.profile?.displayName??story.author.username,authorUsername:story.author.username,synopsis:story.synopsis,genre:story.genres[0]?.genre.name??'General',genres:story.genres.map((item)=>item.genre.name),tags:story.tags.map((item)=>({name:item.tag.name,kind:item.tag.kind})),languageCode:story.languageCode,status:story.status,chapterCount:story.chapters.length,isMature:story.isMature,coverColor:story.coverUrl??'#855300',chapters:story.chapters.map((chapter)=>({...chapter,updatedAt:chapter.updatedAt.toISOString()}))};
  }

  async createStory(params: CreateStoryParams): Promise<StorySummary> {
    const status=params.status??'published';
    const primaryGenre=params.genres[0]??'General';
    if (!(await checkDatabaseConnection())) { const story:StorySummary={id:`story-${Date.now()}`,title:params.title,author:params.authorId,authorUsername:params.authorId,synopsis:params.synopsis,genre:primaryGenre,genres:params.genres,tags:params.tags.map((name)=>({name,kind:storyTagKind(name)??'theme'})),languageCode:'es',status,chapterCount:0,isMature:params.isMature??false,coverColor:params.coverColor??'#855300'};if(status==='published')storyFixtures.unshift(story);const list=offlineStoriesByAuthor.get(params.authorId)??[];list.unshift(story);offlineStoriesByAuthor.set(params.authorId,list);return story; }
    const [genres,tags]=await Promise.all([resolveGenres(params.genres),resolveTags(params.tags)]);const data:Prisma.StoryCreateInput={author:{connect:{id:params.authorId}},title:params.title,slug:`${slugify(params.title,'obra')}-${Date.now().toString().slice(-5)}`,synopsis:params.synopsis,status,isMature:params.isMature??false,coverUrl:params.coverColor??'#855300',...(status==='published'?{publishedAt:new Date()}:{}),genres:{create:genres.map((genre)=>({genre:{connect:{id:genre.id}}}))},tags:{create:tags.map((tag)=>({tag:{connect:{id:tag.id}}}))}};
    const story=await prisma.story.create({data,include:{author:{include:{profile:true}},genres:{include:{genre:true}},tags:{include:{tag:true}}}});return{id:story.id,title:story.title,author:story.author.profile?.displayName??story.author.username,authorUsername:story.author.username,synopsis:story.synopsis,genre:story.genres[0]?.genre.name??primaryGenre,genres:story.genres.map((item)=>item.genre.name),tags:story.tags.map((item)=>({name:item.tag.name,kind:item.tag.kind})),languageCode:story.languageCode,status:story.status,chapterCount:0,isMature:story.isMature,coverColor:story.coverUrl??'#855300'};
  }

  async updateStory(params:UpdateStoryParams){
    if(!(await checkDatabaseConnection()))return null;
    const existing=await prisma.story.findFirst({where:{id:params.storyId,authorId:params.authorId},select:{id:true}});if(!existing)return null;
    const [genres,tags]=await Promise.all([params.genres?resolveGenres(params.genres):null,params.tags?resolveTags(params.tags):null]);
    await prisma.$transaction(async(tx)=>{
      if(genres){await tx.storyGenre.deleteMany({where:{storyId:params.storyId}});await tx.storyGenre.createMany({data:genres.map((genre)=>({storyId:params.storyId,genreId:genre.id}))});}
      if(tags){await tx.storyTag.deleteMany({where:{storyId:params.storyId}});if(tags.length)await tx.storyTag.createMany({data:tags.map((tag)=>({storyId:params.storyId,tagId:tag.id}))});}
      await tx.story.update({where:{id:params.storyId},data:{...(params.title!==undefined?{title:params.title}:{}),...(params.synopsis!==undefined?{synopsis:params.synopsis}:{}),...(params.isMature!==undefined?{isMature:params.isMature}:{}),...(params.coverColor!==undefined?{coverUrl:params.coverColor}:{})}});
    });
    return this.getUserStory(params.authorId,params.storyId);
  }

  async createChapter(params: CreateChapterParams) {
    const status=params.status??'published';const paragraphs=contentToParagraphs(params.content);const plainText=paragraphs.join('\n\n');const count=metrics(plainText);
    if (!(await checkDatabaseConnection())) { const position=chapterFixtures.filter((item)=>item.storyId===params.storyId).length+1;const chapter={id:`chapter-${Date.now()}`,storyId:params.storyId,position,title:params.title,content:paragraphs};chapterFixtures.push(chapter);offlineChapterMeta.set(chapter.id,{authorId:'offline',status,contentVersion:1,updatedAt:new Date().toISOString()});return{...chapter,status,...count,contentVersion:1}; }
    const position=(await prisma.chapter.count({where:{storyId:params.storyId}}))+1;const chapter=await prisma.chapter.create({data:{storyId:params.storyId,title:params.title,slug:`${slugify(params.title,'capitulo')}-${position}`,position,status,contentJson:params.content as Prisma.InputJsonValue,plainText,...count,...(status==='published'?{publishedAt:new Date()}:{})}});if(status==='published')await prisma.story.update({where:{id:params.storyId},data:{publishedChapterCount:{increment:1},wordCount:{increment:count.wordCount}}});return{...chapter,content:params.content};
  }

  async getChapter(authorId:string,storyId:string,chapterId:string){
    if(!(await checkDatabaseConnection())){const chapter=chapterFixtures.find((item)=>item.id===chapterId&&item.storyId===storyId);if(!chapter)return null;const meta=offlineChapterMeta.get(chapterId);return{...chapter,storyTitle:storyFixtures.find((story)=>story.id===storyId)?.title??'Obra',status:meta?.status??'draft',contentVersion:meta?.contentVersion??1,plainText:chapter.content.join('\n\n')};}
    const chapter=await prisma.chapter.findFirst({where:{id:chapterId,storyId,story:{authorId}},include:{story:{select:{title:true}}}});if(!chapter)return null;return{id:chapter.id,storyId:chapter.storyId,storyTitle:chapter.story.title,position:chapter.position,title:chapter.title,status:chapter.status,content:chapter.contentJson,plainText:chapter.plainText,contentVersion:chapter.contentVersion,wordCount:chapter.wordCount,updatedAt:chapter.updatedAt.toISOString()};
  }

  async updateChapter(params:UpdateChapterParams){
    const count=metrics(params.plainText);
    if(!(await checkDatabaseConnection())){const chapter=chapterFixtures.find((item)=>item.id===params.chapterId);if(!chapter)return null;const meta=offlineChapterMeta.get(params.chapterId);const next=(meta?.contentVersion??1)+1;const revisions=offlineRevisions.get(params.chapterId)??[];revisions.unshift({id:`revision-${Date.now()}`,version:meta?.contentVersion??1,title:chapter.title,content:chapter.content,plainText:chapter.content.join('\n\n'),reason:'autosave',createdAt:new Date().toISOString()});offlineRevisions.set(params.chapterId,revisions.slice(0,30));chapter.title=params.title;chapter.content=contentToParagraphs(params.content);offlineChapterMeta.set(params.chapterId,{authorId:params.authorId,status:meta?.status??'draft',contentVersion:next,updatedAt:new Date().toISOString()});return{...chapter,status:meta?.status??'draft',content:params.content,plainText:params.plainText,contentVersion:next,...count};}
    return prisma.$transaction(async(tx)=>{const current=await tx.chapter.findFirst({where:{id:params.chapterId,story:{authorId:params.authorId}}});if(!current)return null;if(current.contentVersion!==params.expectedVersion)return{conflict:true,currentVersion:current.contentVersion};await tx.chapterRevision.create({data:{chapterId:current.id,version:current.contentVersion,title:current.title,contentJson:current.contentJson as Prisma.InputJsonValue,plainText:current.plainText,reason:'autosave'}});const stale=await tx.chapterRevision.findMany({where:{chapterId:current.id},orderBy:{createdAt:'desc'},skip:30,select:{id:true}});if(stale.length)await tx.chapterRevision.deleteMany({where:{id:{in:stale.map((item)=>item.id)}}});const chapter=await tx.chapter.update({where:{id:current.id},data:{title:params.title,contentJson:params.content as Prisma.InputJsonValue,plainText:params.plainText,contentVersion:{increment:1},...count}});if(current.status==='published'&&current.wordCount!==count.wordCount)await tx.story.update({where:{id:current.storyId},data:{wordCount:{increment:count.wordCount-current.wordCount}}});return{...chapter,content:chapter.contentJson};});
  }

  async deleteChapter(authorId: string, storyId: string, chapterId: string) {
    if (!(await checkDatabaseConnection())) {
      const story = (offlineStoriesByAuthor.get(authorId) ?? []).find((item) => item.id === storyId);
      const index = chapterFixtures.findIndex((item) => item.id === chapterId && item.storyId === storyId);
      if (!story || index < 0) return null;
      const [chapter] = chapterFixtures.splice(index, 1);
      offlineChapterMeta.delete(chapterId);
      offlineRevisions.delete(chapterId);
      chapterFixtures
        .filter((item) => item.storyId === storyId)
        .sort((a, b) => a.position - b.position)
        .forEach((item, position) => { item.position = position + 1; });
      story.chapterCount = Math.max(0, story.chapterCount - 1);
      return chapter;
    }

    return prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter.findFirst({
        where: { id: chapterId, storyId, story: { authorId } },
      });
      if (!chapter) return null;
      await tx.chapter.delete({ where: { id: chapter.id } });
      await tx.chapter.updateMany({
        where: { storyId, position: { gt: chapter.position } },
        data: { position: { increment: 100000 } },
      });
      await tx.chapter.updateMany({
        where: { storyId, position: { gt: chapter.position + 100000 } },
        data: { position: { decrement: 100001 } },
      });
      if (chapter.status === 'published') {
        await tx.story.update({
          where: { id: storyId },
          data: {
            publishedChapterCount: { decrement: 1 },
            wordCount: { decrement: chapter.wordCount },
          },
        });
      }
      return chapter;
    });
  }

  async publishStory(authorId:string,storyId:string){if(!(await checkDatabaseConnection())){const story=(offlineStoriesByAuthor.get(authorId)??[]).find((item)=>item.id===storyId);if(!story)return null;story.status='published';if(!storyFixtures.some((item)=>item.id===story.id))storyFixtures.unshift(story);return story;}return prisma.story.updateMany({where:{id:storyId,authorId},data:{status:'published',publishedAt:new Date(),archivedAt:null}});}
  async publishChapter(authorId:string,chapterId:string){if(!(await checkDatabaseConnection())){const meta=offlineChapterMeta.get(chapterId);if(meta)meta.status='published';return meta??null;}return prisma.$transaction(async(tx)=>{const current=await tx.chapter.findFirst({where:{id:chapterId,story:{authorId}}});if(!current)return null;const wasPublished=current.status==='published';const chapter=await tx.chapter.update({where:{id:chapterId},data:{status:'published',publishedAt:new Date()}});if(!wasPublished)await tx.story.update({where:{id:chapter.storyId},data:{publishedChapterCount:{increment:1},wordCount:{increment:chapter.wordCount}}});return chapter;});}
  async archiveStory(authorId:string,storyId:string){if(!(await checkDatabaseConnection())){const story=(offlineStoriesByAuthor.get(authorId)??[]).find((item)=>item.id===storyId);if(!story)return null;story.status='archived';const publicIndex=storyFixtures.findIndex((item)=>item.id===storyId);if(publicIndex>=0)storyFixtures.splice(publicIndex,1);return story;}return prisma.story.updateMany({where:{id:storyId,authorId},data:{status:'archived',archivedAt:new Date()}});}
  async restoreStory(authorId:string,storyId:string){if(!(await checkDatabaseConnection())){const story=(offlineStoriesByAuthor.get(authorId)??[]).find((item)=>item.id===storyId);if(!story)return null;story.status='draft';return story;}return prisma.story.updateMany({where:{id:storyId,authorId,status:'archived'},data:{status:'draft',archivedAt:null}});}
  async revisions(authorId:string,chapterId:string){if(!(await checkDatabaseConnection()))return offlineRevisions.get(chapterId)??[];return prisma.chapterRevision.findMany({where:{chapterId,chapter:{story:{authorId}}},orderBy:{createdAt:'desc'},take:30,select:{id:true,version:true,title:true,reason:true,createdAt:true}});}
  async restoreRevision(authorId:string,chapterId:string,revisionId:string){if(!(await checkDatabaseConnection())){const revision=(offlineRevisions.get(chapterId)??[]).find((item)=>item.id===revisionId);const chapter=chapterFixtures.find((item)=>item.id===chapterId);if(!revision||!chapter)return null;chapter.title=revision.title;chapter.content=contentToParagraphs(revision.content);return chapter;}return prisma.$transaction(async(tx)=>{const revision=await tx.chapterRevision.findFirst({where:{id:revisionId,chapterId,chapter:{story:{authorId}}}});const current=await tx.chapter.findUnique({where:{id:chapterId}});if(!revision||!current)return null;await tx.chapterRevision.create({data:{chapterId:current.id,version:current.contentVersion,title:current.title,contentJson:current.contentJson as Prisma.InputJsonValue,plainText:current.plainText,reason:'before_restore'}});const restoredMetrics=metrics(revision.plainText);const chapter=await tx.chapter.update({where:{id:chapterId},data:{title:revision.title,contentJson:revision.contentJson as Prisma.InputJsonValue,plainText:revision.plainText,contentVersion:{increment:1},...restoredMetrics}});if(current.status==='published'&&current.wordCount!==restoredMetrics.wordCount)await tx.story.update({where:{id:current.storyId},data:{wordCount:{increment:restoredMetrics.wordCount-current.wordCount}}});return chapter;});}
}

export const writerRepository = new WriterRepository();
