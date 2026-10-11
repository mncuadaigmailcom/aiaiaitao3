import re

def strip(src):
    out=[]; i=0; n=len(src)
    while i<n:
        c=src[i]
        if c=='-' and src.startswith('--',i):
            m=re.match(r'--\[(=*)\[', src[i:])
            if m:
                close=']'+m.group(1)+']'
                j=src.find(close, i+len(m.group(0)))
                j = n if j<0 else j+len(close)
                out.append(re.sub(r'[^\n]',' ',src[i:j])); i=j
            else:
                j=src.find('\n',i); j=n if j<0 else j
                out.append(' '*(j-i)); i=j
            continue
        if c=='[':
            m=re.match(r'\[(=*)\[', src[i:])
            if m:
                close=']'+m.group(1)+']'
                j=src.find(close, i+len(m.group(0)))
                j=n if j<0 else j+len(close)
                out.append(re.sub(r'[^\n]',' ',src[i:j])); i=j; continue
        if c in '"\'':
            q=c; j=i+1; buf=[' ']
            while j<n:
                if src[j]=='\\': buf.append('  '); j+=2; continue
                if src[j]==q: j+=1; break
                if src[j]=='\n': break
                buf.append(' '); j+=1
            out.append(''.join(buf)); i=j; continue
        out.append(c); i+=1
    return ''.join(out)
